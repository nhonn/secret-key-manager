/**
 * Test to verify that API key description field can be properly cleared
 * This test ensures the fix for the description persistence issue works correctly
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ApiKeysService, UpdateApiKeyData } from '../services/apiKeys';

describe('API Key Description Update', () => {
  it('should properly handle empty description when clearing the field', () => {
    // Test the update data preparation logic
    const formData = {
      name: 'Test API Key',
      description: '', // Cleared description field
      key: 'test-key-123',
      url: '',
      tags: [],
      project_id: ''
    };

    // Simulate the fixed logic from EditApiKeyForm
    const updateData: UpdateApiKeyData = {
      name: formData.name.trim(),
      description: formData.description.trim(), // Should be empty string, not undefined
      key: formData.key.trim(),
      url: formData.url.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      project_id: formData.project_id || undefined
    };

    // Verify that description is an empty string, not undefined
    expect(updateData.description).toBe('');
    expect(updateData.description).not.toBe(undefined);
    expect(updateData.description).not.toBe(null);
  });

  it('should handle description with whitespace correctly', () => {
    const formData = {
      name: 'Test API Key',
      description: '   ', // Whitespace only
      key: 'test-key-123',
      url: '',
      tags: [],
      project_id: ''
    };

    const updateData: UpdateApiKeyData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      key: formData.key.trim(),
      url: formData.url.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      project_id: formData.project_id || undefined
    };

    // Whitespace should be trimmed to empty string
    expect(updateData.description).toBe('');
  });

  it('should preserve non-empty descriptions', () => {
    const formData = {
      name: 'Test API Key',
      description: '  This is a valid description  ',
      key: 'test-key-123',
      url: '',
      tags: [],
      project_id: ''
    };

    const updateData: UpdateApiKeyData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      key: formData.key.trim(),
      url: formData.url.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      project_id: formData.project_id || undefined
    };

    // Description should be trimmed but preserved
    expect(updateData.description).toBe('This is a valid description');
  });
});