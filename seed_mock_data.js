
const http = require('http');

const mockItems = [
    {
        userStr: 'LEGACY_A + user_a@gmail.com',
        deviceId: 'dev_hybrid_1',
        isHybrid: true,
        vpsPlanId: 'random'
    },
    {
        userStr: 'LEGACY_B + user_b@gmail.com',
        deviceId: 'dev_hybrid_2',
        isHybrid: true,
        vpsPlanId: 'random'
    },
    {
        userStr: 'LEGACY_C + user_c@gmail.com',
        deviceId: 'dev_hybrid_3',
        isHybrid: true,
        vpsPlanId: 'random'
    },
    {
        userStr: 'LEGACY_D + user_d@gmail.com',
        deviceId: 'dev_nv_only_1',
        isHybrid: false
    }
];

const data = JSON.stringify({ items: mockItems });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/mock-data/nodeverse-orders',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
    },
};

const req = http.request(options, (res) => {
    let responseBody = '';
    
    console.log(`Status: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(responseBody);
            console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('Response (text):', responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
});

req.write(data);
req.end();
