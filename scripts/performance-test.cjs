#!/usr/bin/env node

/**
 * Performance Testing Script
 * 
 * This script runs comprehensive performance tests on the database
 * and services to validate optimization effectiveness.
 */

const { createClient } = require('@supabase/supabase-js')
const { performance } = require('perf_hooks')
require('dotenv').config()

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Test configuration
const TEST_CONFIG = {
  iterations: 10,
  warmupIterations: 3,
  testUserId: null // Will be set during auth
}

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  connection: 1000,
  simpleQuery: 500,
  complexQuery: 1500,
  dashboardLoad: 2000
}

/**
 * Utility function to measure execution time
 */
async function measureTime(name, fn, iterations = 1) {
  const times = []
  
  // Warmup
  for (let i = 0; i < Math.min(iterations, 3); i++) {
    try {
      await fn()
    } catch (error) {
      console.warn(`Warmup ${i + 1} failed for ${name}:`, error.message)
    }
  }
  
  // Actual measurements
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await fn()
      const end = performance.now()
      times.push(end - start)
    } catch (error) {
      console.error(`Test ${i + 1} failed for ${name}:`, error.message)
      times.push(Infinity) // Mark as failed
    }
  }
  
  const validTimes = times.filter(t => t !== Infinity)
  if (validTimes.length === 0) {
    return { name, error: 'All iterations failed', times: [] }
  }
  
  const avg = validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
  const min = Math.min(...validTimes)
  const max = Math.max(...validTimes)
  const median = validTimes.sort((a, b) => a - b)[Math.floor(validTimes.length / 2)]
  
  return {
    name,
    average: Math.round(avg * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    median: Math.round(median * 100) / 100,
    successRate: (validTimes.length / times.length) * 100,
    iterations: validTimes.length
  }
}

/**
 * Test database connection performance
 */
async function testConnection() {
  console.log('🔌 Testing database connection...')
  
  return await measureTime(
    'Database Connection',
    async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('count')
        .limit(1)
      
      if (error) throw error
      return data
    },
    5
  )
}

/**
 * Test simple queries
 */
async function testSimpleQueries() {
  console.log('📊 Testing simple queries...')
  
  const tests = [
    {
      name: 'Projects List',
      fn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, created_at')
          .limit(20)
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'Secrets Count',
      fn: async () => {
        const { count, error } = await supabase
          .from('secrets')
          .select('*', { count: 'exact', head: true })
        
        if (error) throw error
        return count
      }
    },
    {
      name: 'API Keys Count',
      fn: async () => {
        const { count, error } = await supabase
          .from('api_keys')
          .select('*', { count: 'exact', head: true })
        
        if (error) throw error
        return count
      }
    }
  ]
  
  const results = []
  for (const test of tests) {
    const result = await measureTime(test.name, test.fn, TEST_CONFIG.iterations)
    results.push(result)
  }
  
  return results
}

/**
 * Test complex queries with joins
 */
async function testComplexQueries() {
  console.log('🔍 Testing complex queries...')
  
  const tests = [
    {
      name: 'Secrets with Projects',
      fn: async () => {
        const { data, error } = await supabase
          .from('secrets')
          .select(`
            id,
            name,
            description,
            created_at,
            projects!inner(name, description)
          `)
          .limit(50)
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'API Keys with Projects',
      fn: async () => {
        const { data, error } = await supabase
          .from('api_keys')
          .select(`
            id,
            name,
            service,
            created_at,
            projects!inner(name)
          `)
          .limit(50)
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'Environment Variables with Projects',
      fn: async () => {
        const { data, error } = await supabase
          .from('environment_variables')
          .select(`
            id,
            name,
            description,
            created_at,
            projects!inner(name)
          `)
          .limit(50)
        
        if (error) throw error
        return data
      }
    }
  ]
  
  const results = []
  for (const test of tests) {
    const result = await measureTime(test.name, test.fn, TEST_CONFIG.iterations)
    results.push(result)
  }
  
  return results
}

/**
 * Test dashboard aggregation queries
 */
async function testDashboardQueries() {
  console.log('📈 Testing dashboard queries...')
  
  const tests = [
    {
      name: 'Dashboard Stats (RPC)',
      fn: async () => {
        const { data, error } = await supabase
          .rpc('get_dashboard_stats')
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'Project Stats (RPC)',
      fn: async () => {
        const { data, error } = await supabase
          .rpc('get_dashboard_project_stats')
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'Recent Items (RPC)',
      fn: async () => {
        const { data, error } = await supabase
          .rpc('get_recent_dashboard_items', { item_limit: 10 })
        
        if (error) throw error
        return data
      }
    }
  ]
  
  const results = []
  for (const test of tests) {
    const result = await measureTime(test.name, test.fn, TEST_CONFIG.iterations)
    results.push(result)
  }
  
  return results
}

/**
 * Test index effectiveness
 */
async function testIndexEffectiveness() {
  console.log('🗂️ Testing index effectiveness...')
  
  const tests = [
    {
      name: 'User ID Filter (Secrets)',
      fn: async () => {
        // This should use the user_id index
        const { data, error } = await supabase
          .from('secrets')
          .select('id, name')
          .eq('user_id', '00000000-0000-0000-0000-000000000000') // Dummy UUID
          .limit(100)
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'Project ID Filter (Secrets)',
      fn: async () => {
        // This should use the project_id index
        const { data, error } = await supabase
          .from('secrets')
          .select('id, name')
          .eq('project_id', '00000000-0000-0000-0000-000000000000') // Dummy UUID
          .limit(100)
        
        if (error) throw error
        return data
      }
    },
    {
      name: 'Created At Range (Secrets)',
      fn: async () => {
        // This should use the created_at index
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data, error } = await supabase
          .from('secrets')
          .select('id, name, created_at')
          .gte('created_at', oneWeekAgo)
          .limit(100)
        
        if (error) throw error
        return data
      }
    }
  ]
  
  const results = []
  for (const test of tests) {
    const result = await measureTime(test.name, test.fn, TEST_CONFIG.iterations)
    results.push(result)
  }
  
  return results
}

/**
 * Generate performance report
 */
function generateReport(testResults) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 PERFORMANCE TEST REPORT')
  console.log('='.repeat(60))
  
  let overallStatus = 'HEALTHY'
  const issues = []
  
  testResults.forEach(category => {
    console.log(`\n🔍 ${category.name.toUpperCase()}:`)
    console.log('-'.repeat(40))
    
    category.results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.name}: ${result.error}`)
        issues.push(`${result.name}: ${result.error}`)
        overallStatus = 'UNHEALTHY'
        return
      }
      
      const status = getPerformanceStatus(result.name, result.average)
      const statusIcon = status === 'FAST' ? '🟢' : status === 'NORMAL' ? '🟡' : '🔴'
      
      if (status === 'SLOW') {
        overallStatus = overallStatus === 'HEALTHY' ? 'DEGRADED' : overallStatus
        issues.push(`${result.name}: ${result.average}ms (slow)`)
      }
      
      console.log(`${statusIcon} ${result.name}:`)
      console.log(`   Average: ${result.average}ms`)
      console.log(`   Range: ${result.min}ms - ${result.max}ms`)
      console.log(`   Median: ${result.median}ms`)
      console.log(`   Success Rate: ${result.successRate.toFixed(1)}%`)
      console.log()
    })
  })
  
  console.log('\n' + '='.repeat(60))
  console.log(`🎯 OVERALL STATUS: ${overallStatus}`)
  
  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES DETECTED:')
    issues.forEach(issue => console.log(`   • ${issue}`))
  }
  
  console.log('\n💡 RECOMMENDATIONS:')
  if (overallStatus === 'HEALTHY') {
    console.log('   • Performance is optimal!')
    console.log('   • Consider monitoring trends over time')
  } else if (overallStatus === 'DEGRADED') {
    console.log('   • Some queries are slower than optimal')
    console.log('   • Review slow queries and consider optimization')
    console.log('   • Check database indexes and query plans')
  } else {
    console.log('   • Critical performance issues detected')
    console.log('   • Immediate optimization required')
    console.log('   • Check database connection and server resources')
  }
  
  console.log('='.repeat(60))
}

/**
 * Get performance status based on query type and duration
 */
function getPerformanceStatus(queryName, duration) {
  let threshold
  
  if (queryName.includes('Connection')) {
    threshold = THRESHOLDS.connection
  } else if (queryName.includes('Dashboard') || queryName.includes('RPC')) {
    threshold = THRESHOLDS.dashboardLoad
  } else if (queryName.includes('with') || queryName.includes('Stats')) {
    threshold = THRESHOLDS.complexQuery
  } else {
    threshold = THRESHOLDS.simpleQuery
  }
  
  if (duration <= threshold * 0.5) return 'FAST'
  if (duration <= threshold) return 'NORMAL'
  return 'SLOW'
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests...')
  console.log(`Iterations per test: ${TEST_CONFIG.iterations}`)
  console.log('\n')
  
  try {
    const testResults = []
    
    // Test connection
    const connectionResult = await testConnection()
    testResults.push({
      name: 'Connection',
      results: [connectionResult]
    })
    
    // Test simple queries
    const simpleResults = await testSimpleQueries()
    testResults.push({
      name: 'Simple Queries',
      results: simpleResults
    })
    
    // Test complex queries
    const complexResults = await testComplexQueries()
    testResults.push({
      name: 'Complex Queries',
      results: complexResults
    })
    
    // Test dashboard queries
    const dashboardResults = await testDashboardQueries()
    testResults.push({
      name: 'Dashboard Queries',
      results: dashboardResults
    })
    
    // Test index effectiveness
    const indexResults = await testIndexEffectiveness()
    testResults.push({
      name: 'Index Effectiveness',
      results: indexResults
    })
    
    // Generate report
    generateReport(testResults)
    
  } catch (error) {
    console.error('❌ Performance test failed:', error)
    process.exit(1)
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      console.log('\n✅ Performance tests completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error)
      process.exit(1)
    })
}

module.exports = {
  runPerformanceTests,
  measureTime,
  testConnection,
  testSimpleQueries,
  testComplexQueries,
  testDashboardQueries,
  testIndexEffectiveness
}