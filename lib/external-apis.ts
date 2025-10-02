// lib/external-apis.ts

const SHODAN_API_KEY = process.env.NEXT_PUBLIC_SHODAN_API_KEY;
const VIRUSTOTAL_API_KEY = process.env.NEXT_PUBLIC_VIRUSTOTAL_API_KEY;

export interface ShodanResult {
  ip: string;
  ports: number[];
  hostnames: string[];
  domains: string[];
  org: string;
  data: Array<{
    port: number;
    transport: string;
    product?: string;
    version?: string;
    banner?: string;
  }>;
}

export interface VirusTotalResult {
  data: {
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
        timeout: number;
      };
      last_analysis_results: {
        [engine: string]: {
          category: string;
          result: string;
          method: string;
        };
      };
      reputation: number;
      tags: string[];
    };
  };
}

export interface ExternalScanResult {
  shodan?: ShodanResult;
  virusTotal?: VirusTotalResult;
  error?: string;
}

export async function scanTargetWithExternalServices(target: string): Promise<ExternalScanResult> {
  const results: ExternalScanResult = {};
  
  try {
    // Run Shodan and VirusTotal scans in parallel
    const [shodanResult, virusTotalResult] = await Promise.allSettled([
      scanWithShodan(target),
      scanWithVirusTotal(target)
    ]);

    if (shodanResult.status === 'fulfilled' && shodanResult.value) {
      results.shodan = shodanResult.value;
    }

    if (virusTotalResult.status === 'fulfilled' && virusTotalResult.value) {
      results.virusTotal = virusTotalResult.value;
    }

    if (shodanResult.status === 'rejected' && virusTotalResult.status === 'rejected') {
      results.error = 'Both Shodan and VirusTotal scans failed';
    }

  } catch (error) {
    console.error('External scan error:', error);
    results.error = 'Scan failed';
  }

  return results;
}

async function scanWithShodan(target: string): Promise<ShodanResult | null> {
  if (!SHODAN_API_KEY) {
    console.warn('Shodan API key not configured');
    return null;
  }

  try {
    const response = await fetch(`https://api.shodan.io/shodan/host/${target}?key=${SHODAN_API_KEY}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('No Shodan data found for target');
        return null;
      }
      throw new Error(`Shodan API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Shodan scan failed:', error);
    return null;
  }
}

async function scanWithVirusTotal(target: string): Promise<VirusTotalResult | null> {
  if (!VIRUSTOTAL_API_KEY) {
    console.warn('VirusTotal API key not configured');
    return null;
  }

  try {
    // Check if target is IP or domain
    const isIP = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(target);
    const endpoint = isIP ? 'ip_addresses' : 'domains';
    
    const response = await fetch(
      `https://www.virustotal.com/api/v3/${endpoint}/${target}`,
      {
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log('No VirusTotal data found for target');
        return null;
      }
      throw new Error(`VirusTotal API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('VirusTotal scan failed:', error);
    return null;
  }
}