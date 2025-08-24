import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Play, RefreshCw } from 'lucide-react';
import { ApiKeyTester } from '../tests/apiKeyTest';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const ApiKeyTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

  const testSuite = [
    { name: 'Authentication', key: 'auth' },
    { name: 'Encryption/Decryption', key: 'encryption' },
    { name: 'Create API Key', key: 'create' },
    { name: 'Get API Key', key: 'get' },
    { name: 'Get All API Keys', key: 'getAll' },
    { name: 'Update API Key', key: 'update' },
    { name: 'Search API Keys', key: 'search' },
    { name: 'Validation', key: 'validation' },
    { name: 'Error Handling', key: 'errorHandling' },
    { name: 'Delete API Key', key: 'delete' }
  ];

  const initializeTests = () => {
    const initialResults: TestResult[] = testSuite.map(test => ({
      name: test.name,
      status: 'pending'
    }));
    setTestResults(initialResults);
  };

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => prev.map(result => 
      result.name === testName 
        ? { ...result, status, message, duration }
        : result
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    initializeTests();

    const tester = new ApiKeyTester();
    let allPassed = true;

    try {
      // Override console.log to capture test output
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        const message = args.join(' ');
        
        // Parse test messages to update UI
        if (message.includes('Testing Authentication')) {
          updateTestResult('Authentication', 'running');
        } else if (message.includes('User authenticated')) {
          updateTestResult('Authentication', 'passed', 'User authenticated successfully');
        } else if (message.includes('Testing Encryption/Decryption')) {
          updateTestResult('Encryption/Decryption', 'running');
        } else if (message.includes('Decryption successful')) {
          updateTestResult('Encryption/Decryption', 'passed', 'Encryption and decryption working correctly');
        } else if (message.includes('Testing API Key Creation')) {
          updateTestResult('Create API Key', 'running');
        } else if (message.includes('API Key created successfully')) {
          updateTestResult('Create API Key', 'passed', 'API key created and stored successfully');
        } else if (message.includes('Testing API Key Retrieval')) {
          updateTestResult('Get API Key', 'running');
        } else if (message.includes('API Key retrieved successfully')) {
          updateTestResult('Get API Key', 'passed', 'API key retrieved successfully');
        } else if (message.includes('Testing Get All API Keys')) {
          updateTestResult('Get All API Keys', 'running');
        } else if (message.includes('Retrieved all API keys successfully')) {
          updateTestResult('Get All API Keys', 'passed', 'All API keys retrieved successfully');
        } else if (message.includes('Testing API Key Update')) {
          updateTestResult('Update API Key', 'running');
        } else if (message.includes('API Key updated successfully')) {
          updateTestResult('Update API Key', 'passed', 'API key updated successfully');
        } else if (message.includes('Testing API Key Search')) {
          updateTestResult('Search API Keys', 'running');
        } else if (message.includes('Search completed successfully')) {
          updateTestResult('Search API Keys', 'passed', 'Search functionality working correctly');
        } else if (message.includes('Testing Validation')) {
          updateTestResult('Validation', 'running');
        } else if (message.includes('Validation correctly rejected')) {
          updateTestResult('Validation', 'passed', 'Input validation working correctly');
        } else if (message.includes('Testing Error Handling')) {
          updateTestResult('Error Handling', 'running');
        } else if (message.includes('Error handling works correctly')) {
          updateTestResult('Error Handling', 'passed', 'Error handling working correctly');
        } else if (message.includes('Testing API Key Deletion')) {
          updateTestResult('Delete API Key', 'running');
        } else if (message.includes('Deletion verified')) {
          updateTestResult('Delete API Key', 'passed', 'API key deleted successfully');
        }
        
        originalLog(...args);
      };

      console.error = (message: any, ...args: any[]) => {
        originalError(message, ...args);
        const messageStr = typeof message === 'string' ? message : String(message);
        
        // Log detailed error information
        console.log('🔍 Detailed Error Info:', {
          message: messageStr,
          args,
          timestamp: new Date().toISOString()
        });
        
        if (messageStr.includes('Authentication test failed')) {
          updateTestResult('Authentication', 'failed', 'Authentication failed');
          allPassed = false;
        } else if (messageStr.includes('Encryption test failed')) {
          updateTestResult('Encryption/Decryption', 'failed', 'Encryption/decryption failed');
          allPassed = false;
        } else if (messageStr.includes('API Key creation test failed')) {
          updateTestResult('Create API Key', 'failed', 'API key creation failed');
          allPassed = false;
        } else if (messageStr.includes('API Key retrieval test failed')) {
          updateTestResult('Get API Key', 'failed', 'API key retrieval failed');
          allPassed = false;
        } else if (messageStr.includes('Get All API Keys test failed')) {
          updateTestResult('Get All API Keys', 'failed', 'Get all API keys failed');
          allPassed = false;
        } else if (messageStr.includes('API Key update test failed')) {
          updateTestResult('Update API Key', 'failed', 'API key update failed');
          allPassed = false;
        } else if (messageStr.includes('API Key search test failed')) {
          updateTestResult('Search API Keys', 'failed', 'Search functionality failed');
          allPassed = false;
        } else if (messageStr.includes('Validation test failed')) {
          updateTestResult('Validation', 'failed', 'Validation test failed');
          allPassed = false;
        } else if (messageStr.includes('Error handling test failed')) {
          updateTestResult('Error Handling', 'failed', 'Error handling test failed');
          allPassed = false;
        } else if (messageStr.includes('API Key deletion test failed')) {
          updateTestResult('Delete API Key', 'failed', 'API key deletion failed');
          allPassed = false;
        }
      };

      await tester.runAllTests();
      
      // Restore original console methods
      console.log = originalLog;
      console.error = originalError;
      
      setOverallStatus(allPassed ? 'passed' : 'failed');
    } catch (error) {
      console.error('Test suite failed:', error);
      setOverallStatus('failed');
      allPassed = false;
      
      // Mark any running tests as failed
      setTestResults(prev => prev.map(result => 
        result.status === 'running' 
          ? { ...result, status: 'failed', message: 'Test interrupted by error' }
          : result
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      running: 'bg-blue-100 text-blue-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          <h2 className="text-xl font-semibold text-gray-900">API Key Test Runner</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Comprehensive testing suite for API key generation, encryption, and CRUD operations
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={runTests} 
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </button>
          </div>
          
          {overallStatus !== 'idle' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Overall Status:</span>
              {getStatusBadge(overallStatus)}
            </div>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <div className="grid gap-2">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {result.message && (
                      <span className="text-sm text-gray-600">{result.message}</span>
                    )}
                    {result.duration && (
                      <span className="text-xs text-gray-500">{result.duration}ms</span>
                    )}
                    {getStatusBadge(result.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Test Coverage</h4>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>• User authentication and authorization</li>
            <li>• API key encryption and decryption</li>
            <li>• CRUD operations (Create, Read, Update, Delete)</li>
            <li>• Search and filtering functionality</li>
            <li>• Input validation and error handling</li>
            <li>• Database integration and data persistence</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyTestRunner;