interface FarcasterUser {
  username: string;
  profileImage: string;
  walletAddress: string;
}

export async function getUserDetails(fid: number): Promise<FarcasterUser | null> {
  // For now, return mock data
  return {
    username: `user${fid}`,
    profileImage: '/images/default.png',
    walletAddress: '0x0000000000000000000000000000000000000000'
  };
} 