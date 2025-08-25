/**
 * Client-side encryption service using Web Crypto API
 * Implements AES-256-GCM encryption for secure data storage
 * Uses user-based encryption keys derived from OAuth session
 */

import { AuthService } from './auth'

export interface EncryptedData {
  data: string // Base64 encoded encrypted data
  iv: string   // Base64 encoded initialization vector
  salt: string // Base64 encoded salt for key derivation
}

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12 // 96 bits for GCM
  private static readonly SALT_LENGTH = 16 // 128 bits
  private static readonly ITERATIONS = 100000 // PBKDF2 iterations

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)

    // Import the password as a key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Generates a random byte array of specified length
   */
  private static generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length))
  }

  /**
   * Converts Uint8Array to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Converts Base64 string to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Encrypts plaintext data using AES-256-GCM with user-based key
   */
  static async encrypt(plaintext: string): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(plaintext)

      // Generate random salt and IV
      const salt = this.generateRandomBytes(this.SALT_LENGTH)
      const iv = this.generateRandomBytes(this.IV_LENGTH)

      // Get user-based encryption key
      const userKey = await this.getUserEncryptionKey()
      const key = await this.deriveKey(userKey, salt)

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      )

      return {
        data: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt)
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypts encrypted data using AES-256-GCM with user-based key
   */
  static async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      // Convert Base64 strings back to Uint8Arrays
      const data = this.base64ToArrayBuffer(encryptedData.data)
      const iv = this.base64ToArrayBuffer(encryptedData.iv)
      const salt = this.base64ToArrayBuffer(encryptedData.salt)

      // Get user-based encryption key
      const userKey = await this.getUserEncryptionKey()
      const key = await this.deriveKey(userKey, salt)

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      )

      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data - invalid password or corrupted data')
    }
  }

  /**
   * Generates a secure random password
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    const randomBytes = this.generateRandomBytes(length)
    let password = ''
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length]
    }
    
    return password
  }

  /**
   * Validates if the Web Crypto API is available
   */
  static isSupported(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof crypto.getRandomValues !== 'undefined'
    )
  }

  /**
   * Generates a master key for the user (should be stored securely)
   */
  static async generateMasterKey(): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API is not supported in this environment')
    }

    // Generate a 256-bit master key
    const keyBytes = this.generateRandomBytes(32)
    return this.arrayBufferToBase64(keyBytes)
  }

  /**
   * Hashes a password for storage (not for encryption)
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return this.arrayBufferToBase64(hashBuffer)
  }

  /**
   * Gets user-specific encryption key derived from OAuth session
   */
  private static async getUserEncryptionKey(): Promise<string> {
    const user = await AuthService.getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated - cannot generate encryption key')
    }

    // Use user ID and email to create a consistent encryption key
    // This ensures the same key is generated for the same user across sessions
    const keyMaterial = `${user.id}:${user.email}:${user.created_at || ''}`
    
    // Hash the key material to create a consistent encryption key
    const encoder = new TextEncoder()
    const data = encoder.encode(keyMaterial)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    return this.arrayBufferToBase64(hashBuffer)
  }

  /**
   * Legacy encrypt method for backward compatibility (deprecated)
   * @deprecated Use encrypt() without password parameter instead
   */
  static async encryptWithPassword(plaintext: string, password: string): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(plaintext)

      // Generate random salt and IV
      const salt = this.generateRandomBytes(this.SALT_LENGTH)
      const iv = this.generateRandomBytes(this.IV_LENGTH)

      // Derive encryption key
      const key = await this.deriveKey(password, salt)

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      )

      return {
        data: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt)
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Legacy decrypt method for backward compatibility (deprecated)
   * @deprecated Use decrypt() without password parameter instead
   */
  static async decryptWithPassword(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Convert Base64 strings back to Uint8Arrays
      const data = this.base64ToArrayBuffer(encryptedData.data)
      const iv = this.base64ToArrayBuffer(encryptedData.iv)
      const salt = this.base64ToArrayBuffer(encryptedData.salt)

      // Derive decryption key
      const key = await this.deriveKey(password, salt)

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      )

      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data - invalid password or corrupted data')
    }
  }
}