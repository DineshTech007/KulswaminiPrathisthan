/**
 * Quick Route Test Script
 * Run this to verify API endpoints are accessible
 * 
 * Usage: node scripts/test-routes.js
 */

const API_BASE = process.env.API_URL || 'https://kulswaminiprathisthan.onrender.com';

async function testRoute(name, url, method = 'GET') {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' }
    });
    const status = response.status;
    const statusText = response.statusText;
    
    if (status === 404) {
      console.log(`❌ ${name}: 404 Not Found`);
      return false;
    } else if (status === 403 || status === 401) {
      console.log(`✅ ${name}: ${status} ${statusText} (endpoint exists, auth required)`);
      return true;
    } else if (status >= 200 && status < 500) {
      console.log(`✅ ${name}: ${status} ${statusText}`);
      return true;
    } else {
      console.log(`⚠️  ${name}: ${status} ${statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing API Routes...\n');
  console.log(`API Base: ${API_BASE}\n`);
  
  const tests = [
    ['Health Check', '/api/hello', 'GET'],
    ['Session Check', '/api/session', 'GET'],
    ['Upload Endpoint', '/api/upload', 'POST'],
    ['Upload Image Endpoint', '/api/upload-image', 'POST'],
    ['Upload Site Icon', '/api/upload-site-icon', 'POST'],
    ['Get Data', '/api/data', 'GET'],
    ['Get Settings', '/api/settings', 'GET'],
    ['Get News', '/api/news', 'GET'],
    ['Get Events', '/api/events', 'GET'],
    ['Add Child', '/api/add-child', 'POST'],
    ['Remove Child', '/api/remove-child', 'POST'],
    ['Update Member', '/api/update-member', 'POST'],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, url, method] of tests) {
    const result = await testRoute(name, url, method);
    if (result) passed++;
    else failed++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed}/${tests.length} passed`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} endpoint(s) not found - deploy latest code!`);
  } else {
    console.log('✅ All endpoints accessible!');
  }
  console.log('='.repeat(50));
}

runTests().catch(console.error);
