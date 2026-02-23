import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import { ApiError } from '../utils/ApiError';

const prisma = new PrismaClient();

interface ChainConfig {
  apiUrl: string;
  apiKey: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: config.etherscanApiKey,
  },
  polygon: {
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: config.polygonscanApiKey,
  },
  bsc: {
    apiUrl: 'https://api.bscscan.com/api',
    apiKey: config.bscscanApiKey,
  },
  arbitrum: {
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: config.arbiscanApiKey,
  },
};

interface ContractSourceResponse {
  sourceCode: string;
  abi: string;
  contractName: string;
  compilerVersion: string;
  optimizationUsed: string;
  runs: string;
  constructorArguments: string;
  evmVersion: string;
  library: string;
  licenseType: string;
  proxy: string;
  implementation: string;
  swarmSource: string;
}

export class EtherscanService {
  /**
   * Fetch contract source code from blockchain explorer
   */
  static async fetchContractSource(
    address: string,
    chain: string = 'ethereum'
  ): Promise<{
    sourceCode: string;
    abi: any;
    compilerVersion: string;
    isVerified: boolean;
    contractName?: string;
  }> {
    // Check cache first
    if (config.enableCaching) {
      const cached = await prisma.contractCache.findUnique({
        where: {
          contractAddress_chain: {
            contractAddress: address.toLowerCase(),
            chain,
          },
        },
      });

      if (cached && cached.expiresAt > new Date()) {
        return {
          sourceCode: cached.sourceCode,
          abi: cached.abi,
          compilerVersion: cached.compilerVersion || '',
          isVerified: cached.isVerified,
        };
      }
    }

    // Fetch from blockchain explorer
    const chainConfig = CHAIN_CONFIGS[chain];
    if (!chainConfig) {
      throw new ApiError(400, 'INVALID_CHAIN', `Unsupported chain: ${chain}`);
    }

    if (!chainConfig.apiKey) {
      throw new ApiError(500, 'MISSING_API_KEY', `API key not configured for chain: ${chain}`);
    }

    try {
      const response = await axios.get(chainConfig.apiUrl, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address,
          apikey: chainConfig.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.status !== '1') {
        throw new ApiError(
          404,
          'CONTRACT_NOT_FOUND',
          `Contract not found or not verified on ${chain}`
        );
      }

      const result: ContractSourceResponse = response.data.result[0];

      // Check if contract is verified
      if (!result.sourceCode || result.sourceCode === '') {
        throw new ApiError(
          400,
          'CONTRACT_NOT_VERIFIED',
          `Contract at ${address} is not verified on ${chain}`
        );
      }

      // Parse source code (may be JSON for multi-file contracts)
      let sourceCode = result.sourceCode;
      if (sourceCode.startsWith('{')) {
        try {
          const parsed = JSON.parse(sourceCode.slice(1, -1));
          if (parsed.sources) {
            // Multi-file contract
            sourceCode = Object.values(parsed.sources)
              .map((s: any) => s.content)
              .join('\n\n');
          }
        } catch (e) {
          // Single file contract
        }
      }

      let abi;
      try {
        abi = JSON.parse(result.abi);
      } catch (e) {
        abi = null;
      }

      // Cache the result
      if (config.enableCaching) {
        await prisma.contractCache.upsert({
          where: {
            contractAddress_chain: {
              contractAddress: address.toLowerCase(),
              chain,
            },
          },
          create: {
            contractAddress: address.toLowerCase(),
            chain,
            sourceCode,
            abi,
            compilerVersion: result.compilerVersion,
            isVerified: true,
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
          update: {
            sourceCode,
            abi,
            compilerVersion: result.compilerVersion,
            isVerified: true,
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      return {
        sourceCode,
        abi,
        compilerVersion: result.compilerVersion,
        isVerified: true,
        contractName: result.contractName,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new ApiError(504, 'GATEWAY_TIMEOUT', 'Request to blockchain explorer timed out');
        }
        throw new ApiError(
          502,
          'BAD_GATEWAY',
          `Failed to fetch contract from blockchain explorer: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate Ethereum address format
   */
  static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get supported chains
   */
  static getSupportedChains(): string[] {
    return Object.keys(CHAIN_CONFIGS);
  }
}
