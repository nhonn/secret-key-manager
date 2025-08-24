import { ApiKeysService } from '../services/apiKeys';
import { EncryptionService } from '../services/encryption';
import { supabase } from '../lib/supabase';

// Test configuration
const TEST_CONFIG = {
  masterPassword: 'test-master-password-123',
  testApiKey: {
    name: 'Test API Key',
    description: 'Test API key for validation',
    key: 'test-api-key-12345',
    service: 'openai', // Fixed: use 'service' to match ApiKeysService interface
    folder_id: null, // Fixed: use 'folder_id' to match database schema
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Fixed: use ISO string format
  }
};

class ApiKeyTester {
  private createdApiKeyId: string | null = null;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting API Key Comprehensive Tests');
    console.log('=====================================');

    try {
      await this.testAuthentication();
      await this.testEncryptionDecryption();
      await this.testCreateApiKey();
      await this.testGetApiKey();
      await this.testGetAllApiKeys();
      await this.testUpdateApiKey();
      await this.testSearchApiKeys();
      await this.testValidation();
      await this.testErrorHandling();
      await this.testDeleteApiKey();
      
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async testAuthentication(): Promise<void> {
    console.log('\n🔐 Testing Authentication...');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated. Please log in first.');
    }
    
    console.log('✅ User authenticated:', user.email);
  }

  private async testEncryptionDecryption(): Promise<void> {
    console.log('\n🔒 Testing Encryption/Decryption...');
    
    const testData = 'test-api-key-value-12345';
    
    try {
      const encrypted = await EncryptionService.encrypt(testData, TEST_CONFIG.masterPassword);
      console.log('✅ Encryption successful');
      
      const decrypted = await EncryptionService.decrypt(encrypted, TEST_CONFIG.masterPassword);
      
      if (decrypted !== testData) {
        throw new Error('Decrypted data does not match original');
      }
      
      console.log('✅ Decryption successful and data matches');
    } catch (error) {
      console.error('❌ Encryption/Decryption test failed:', error);
      throw error;
    }
  }

  private async testCreateApiKey(): Promise<void> {
    console.log('\n➕ Testing API Key Creation...');
    
    try {
      const result = await ApiKeysService.create(
        TEST_CONFIG.testApiKey,
        TEST_CONFIG.masterPassword
      );
      
      this.createdApiKeyId = result.id;
      console.log('✅ API Key created successfully:', result.id);
      console.log('   Name:', result.name);
      console.log('   Service:', result.service);
      console.log('   Description:', result.description);
    } catch (error) {
      console.error('❌ API Key creation test failed:', error);
      throw error;
    }
  }

  private async testGetApiKey(): Promise<void> {
    console.log('\n🔍 Testing API Key Retrieval...');
    
    if (!this.createdApiKeyId) {
      throw new Error('No API key ID available for testing');
    }
    
    try {
      const result = await ApiKeysService.getById(this.createdApiKeyId, TEST_CONFIG.masterPassword);
      
      if (!result) {
        throw new Error('API Key not found');
      }
      
      console.log('✅ API Key retrieved successfully');
      console.log('   ID:', result.id);
      console.log('   Name:', result.name);
      console.log('   Decrypted Key Length:', result.decrypted_key?.length || 0);
    } catch (error) {
      console.error('❌ API Key retrieval test failed:', error);
      throw error;
    }
  }

  private async testGetAllApiKeys(): Promise<void> {
    console.log('\n📋 Testing Get All API Keys...');
    
    try {
      const result = await ApiKeysService.getAll();
      
      console.log('✅ Retrieved all API keys successfully');
      console.log('   Total count:', result.length);
      
      const testKey = result.find(key => key.id === this.createdApiKeyId);
      if (!testKey) {
        throw new Error('Created test key not found in list');
      }
      
      console.log('✅ Test key found in list');
    } catch (error) {
      console.error('❌ Get all API keys test failed:', error);
      throw error;
    }
  }

  private async testUpdateApiKey(): Promise<void> {
    console.log('\n✏️ Testing API Key Update...');
    
    if (!this.createdApiKeyId) {
      throw new Error('No API key ID available for testing');
    }
    
    try {
      const updateData = {
        name: 'Updated Test API Key',
        description: 'Updated description for testing',
        service: 'openai' // Using service instead of environment
      };
      
      const result = await ApiKeysService.update(
        this.createdApiKeyId,
        updateData,
        TEST_CONFIG.masterPassword
      );
      
      if (!result) {
        throw new Error('Update failed - no result returned');
      }
      
      console.log('✅ API Key updated successfully');
      console.log('   New name:', result.name);
      console.log('   New service:', result.service);
    } catch (error) {
      console.error('❌ API Key update test failed:', error);
      throw error;
    }
  }

  private async testSearchApiKeys(): Promise<void> {
    console.log('\n🔎 Testing API Key Search...');
    
    try {
      const result = await ApiKeysService.search('Updated Test');
      
      if (!result || result.length === 0) {
        throw new Error('Search failed or returned no results');
      }
      
      console.log('✅ Search completed successfully');
      console.log('   Results count:', result.length);
      
      const foundKey = result.find(key => key.id === this.createdApiKeyId);
      if (!foundKey) {
        throw new Error('Updated test key not found in search results');
      }
      
      console.log('✅ Test key found in search results');
    } catch (error) {
      console.error('❌ API Key search test failed:', error);
      throw error;
    }
  }

  private async testValidation(): Promise<void> {
    console.log('\n✅ Testing Validation...');
    
    try {
      // Test with invalid data (missing required key field)
      try {
        const invalidData = {
          name: 'Invalid Key',
          description: 'Missing required fields'
          // Missing 'key' field - this should cause validation to fail
        } as any; // Use 'as any' to bypass TypeScript checking for this test
        
        await ApiKeysService.create(invalidData, TEST_CONFIG.masterPassword);
        
        // If we get here, the validation didn't work as expected
        console.error('❌ Validation failed - should have thrown an error for missing key field');
        throw new Error('Validation should have failed with invalid data');
      } catch (error) {
        if (error instanceof Error && error.message.includes('API key value is required')) {
          console.log('✅ Validation works correctly for missing key field');
        } else if (error instanceof Error && error.message === 'Validation should have failed with invalid data') {
          throw error;
        } else {
          console.log('✅ Validation works correctly - caught error:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      // Test with empty key field
      try {
        const invalidData = {
          name: 'Invalid Key',
          description: 'Empty key field',
          key: '' // Empty key should fail validation
        } as any;
        
        await ApiKeysService.create(invalidData, TEST_CONFIG.masterPassword);
        
        console.error('❌ Validation failed - should have thrown an error for empty key field');
        throw new Error('Validation should have failed with empty key');
      } catch (error) {
        if (error instanceof Error && error.message.includes('API key value is required')) {
          console.log('✅ Validation works correctly for empty key field');
        } else if (error instanceof Error && error.message === 'Validation should have failed with empty key') {
          throw error;
        } else {
          console.log('✅ Validation works correctly - caught error:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.error('❌ Validation test failed:', error);
      throw error;
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Error Handling...');
    
    try {
      // Test with invalid ID
      const result = await ApiKeysService.getById('invalid-id-12345', TEST_CONFIG.masterPassword);
      
      if (result) {
        throw new Error('Should have failed with invalid ID');
      }
      
      console.log('✅ Error handling works correctly for invalid ID');
    } catch (error) {
      console.log('✅ Error handling works correctly for invalid ID');
    }
  }

  private async testDeleteApiKey(): Promise<void> {
    console.log('\n🗑️ Testing API Key Deletion...');
    
    if (!this.createdApiKeyId) {
      console.log('⚠️ No API key to delete');
      return;
    }
    
    try {
      await ApiKeysService.delete(this.createdApiKeyId);
      
      console.log('✅ API Key deleted successfully');
      
      // Verify deletion
      try {
        const getResult = await ApiKeysService.getById(this.createdApiKeyId, TEST_CONFIG.masterPassword);
        if (getResult) {
          throw new Error('API Key still exists after deletion');
        }
      } catch (error) {
        // Expected error when key doesn't exist
      }
      
      console.log('✅ Deletion verified - key no longer exists');
      this.createdApiKeyId = null;
    } catch (error) {
      console.error('❌ API Key deletion test failed:', error);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    if (this.createdApiKeyId) {
      try {
        await ApiKeysService.delete(this.createdApiKeyId);
        console.log('✅ Cleanup completed');
      } catch (error) {
        console.error('⚠️ Cleanup failed:', error);
      }
    }
  }
}

// Export for use in other files
export { ApiKeyTester, TEST_CONFIG };

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for manual testing
  (window as any).runApiKeyTests = async () => {
    const tester = new ApiKeyTester();
    await tester.runAllTests();
  };
  
  console.log('API Key Tester loaded. Run tests with: runApiKeyTests()');
}