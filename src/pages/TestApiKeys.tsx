import React from 'react';
import Layout from '../components/Layout';
import ApiKeyTestRunner from '../components/ApiKeyTestRunner';
import { Shield, Key, Database, Zap, AlertTriangle } from 'lucide-react';

const TestApiKeys: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">API Key Testing Suite</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive testing environment for validating API key generation, encryption, storage, and management functionality.
          </p>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-amber-800">
              <strong>Security Notice:</strong> This testing suite uses real encryption and database operations. 
              Test data will be created and may persist in your database. Use with caution in production environments.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Shield className="h-5 w-5 text-blue-600" />
                Security Tests
              </div>
            </div>
            <div className="p-4 pt-0">
              <p className="text-sm text-gray-600">
                Validates encryption, decryption, and master password authentication mechanisms.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Database className="h-5 w-5 text-green-600" />
                CRUD Operations
              </div>
            </div>
            <div className="p-4 pt-0">
              <p className="text-sm text-gray-600">
                Tests create, read, update, and delete operations for API keys with proper data integrity.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Key className="h-5 w-5 text-purple-600" />
                Data Integrity
              </div>
            </div>
            <div className="p-4 pt-0">
              <p className="text-sm text-gray-600">
                Ensures API key data remains consistent and secure throughout all operations.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Zap className="h-5 w-5 text-orange-600" />
                Performance
              </div>
            </div>
            <div className="p-4 pt-0">
              <p className="text-sm text-gray-600">
                Measures response times and validates system performance under test conditions.
              </p>
            </div>
          </div>
        </div>

        <ApiKeyTestRunner />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Core Functionality Tests</h3>
              <p className="text-sm text-gray-600 mt-1">
                Essential tests that validate the fundamental API key operations
              </p>
            </div>
            <div className="p-6">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Master password authentication
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  API key creation with encryption
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Secure storage and retrieval
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Data decryption and validation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Update and delete operations
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Functionality Tests</h3>
              <p className="text-sm text-gray-600 mt-1">
                Additional tests for edge cases and advanced features
              </p>
            </div>
            <div className="p-6">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Search and filtering capabilities
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Input validation and error handling
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Bulk operations performance
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Concurrent access handling
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Data consistency verification
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Security Considerations</h3>
            <p className="text-sm text-gray-600 mt-1">
              Important security aspects validated by these tests
            </p>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h5 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Encryption
                </h5>
                <p className="text-sm text-gray-600">
                  All API keys are encrypted using AES-256-GCM with user-specific master passwords
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h5 className="font-semibold mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-500" />
                  Access Control
                </h5>
                <p className="text-sm text-gray-600">
                  Row-level security ensures users can only access their own API keys
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h5 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-500" />
                  Data Protection
                </h5>
                <p className="text-sm text-gray-600">
                  Sensitive data is never stored in plain text and is properly sanitized
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestApiKeys;