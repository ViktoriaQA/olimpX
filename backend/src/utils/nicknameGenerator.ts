/**
 * Utility functions for generating nicknames from emails
 */

/**
 * Generates a nickname from an email address
 * Example: test_zox@example.com -> test_zox
 * 
 * @param email - The email address to convert
 * @returns The generated nickname (part before @)
 */
export function generateNicknameFromEmail(email: string): string {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }
  
  // Split at @ and take the first part
  const nickname = email.split('@')[0];
  
  // Validate nickname is not empty
  if (!nickname || nickname.trim().length === 0) {
    throw new Error('Email does not contain a valid nickname part');
  }
  
  return nickname.trim();
}

/**
 * Validates if a nickname is valid
 * 
 * @param nickname - The nickname to validate
 * @returns True if valid, false otherwise
 */
export function isValidNickname(nickname: string): boolean {
  if (!nickname || nickname.trim().length === 0) {
    return false;
  }
  
  // Nickname should be 3-30 characters, alphanumeric and underscores only
  const nicknameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return nicknameRegex.test(nickname.trim());
}

/**
 * Generates a unique nickname by appending a number if needed
 * 
 * @param baseNickname - The base nickname
 * @param existingNicknames - Array of existing nicknames to check against
 * @returns A unique nickname
 */
export function generateUniqueNickname(
  baseNickname: string, 
  existingNicknames: string[]
): string {
  let nickname = baseNickname;
  let counter = 1;
  
  while (existingNicknames.includes(nickname)) {
    nickname = `${baseNickname}_${counter}`;
    counter++;
  }
  
  return nickname;
}
