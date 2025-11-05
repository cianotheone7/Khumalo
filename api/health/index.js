/**
 * Health Check Endpoint
 * 
 * Provides application health status and service availability
 * Can be used for monitoring, load balancer health checks, etc.
 */

module.exports = async function (context, req) {
    context.log('Health check request received');

    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.VITE_ENVIRONMENT || 'production',
        services: {
            api: {
                status: 'up',
                message: 'API is operational'
            },
            storage: {
                status: checkStorageConfig() ? 'up' : 'down',
                message: checkStorageConfig() ? 'Storage configured' : 'Storage not configured'
            },
            openai: {
                status: checkOpenAIConfig() ? 'up' : 'down',
                message: checkOpenAIConfig() ? 'OpenAI configured' : 'OpenAI not configured'
            }
        },
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
    };

    // Determine overall health status
    const allServicesUp = Object.values(healthStatus.services).every(
        service => service.status === 'up'
    );

    if (!allServicesUp) {
        healthStatus.status = 'degraded';
    }

    // Return 200 if healthy, 503 if degraded
    context.res = {
        status: allServicesUp ? 200 : 503,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        },
        body: healthStatus
    };
};

// Helper to check if storage is configured
function checkStorageConfig() {
    return !!(
        process.env.AZURE_STORAGE_ACCOUNT_NAME && 
        process.env.AZURE_STORAGE_ACCOUNT_KEY
    );
}

// Helper to check if OpenAI is configured
function checkOpenAIConfig() {
    return !!(
        process.env.VITE_AZURE_OPENAI_ENDPOINT && 
        process.env.VITE_AZURE_OPENAI_API_KEY
    );
}


