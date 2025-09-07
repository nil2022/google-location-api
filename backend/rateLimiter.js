// backend/rateLimiter.js

import chalk from "chalk";

const config = {
    ipLimit: {
        requests: parseInt(process.env.RATE_LIMIT_IP_REQUESTS, 10) || 10,
        windowMs: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS, 10) || 60000,
    },
    burstLimit: {
        requests: parseInt(process.env.RATE_LIMIT_BURST_REQUESTS, 10) || 5,
        windowMs: parseInt(process.env.RATE_LIMIT_BURST_WINDOW_MS, 10) || 10000,
    },
    globalLimit: {
        requests: parseInt(process.env.RATE_LIMIT_GLOBAL_REQUESTS, 10) || 100,
        windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 10) || 60000,
    },
    blacklist: {
        threshold: parseInt(process.env.BLACKLIST_HOURLY_THRESHOLD, 10) || 50,
        durationMs: parseInt(process.env.BLACKLIST_DURATION_MS, 10) || 3600000,
        windowMs: 3600000, // 1 hour
    },
};

const requestsByIp = new Map();
const blacklistedIps = new Map();
let globalRequests = [];

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requestsByIp.entries()) {
        const recentRequests = data.filter(time => now - time < config.blacklist.windowMs);
        if (recentRequests.length > 0) {
            requestsByIp.set(ip, recentRequests);
        } else {
            requestsByIp.delete(ip);
        }
    }
    for (const [ip, expiry] of blacklistedIps.entries()) {
        if (now > expiry) {
            blacklistedIps.delete(ip);
            console.log(`IP ${ip} removed from blacklist.`);
        }
    }
    globalRequests = globalRequests.filter(time => now - time < config.globalLimit.windowMs);
}, 60000);

const rateLimiter = (req, res, next) => {
    const now = Date.now();
    const ip = req.ip;

    // 1. Check Blacklist
    if (blacklistedIps.has(ip) && now < blacklistedIps.get(ip)) {
        return res.status(429).json({ error: "Too many requests. IP temporarily blocked." });
    }

    const ipRequests = requestsByIp.get(ip) || [];

    // 2. Check Hourly Limit for Blacklisting
    const hourlyRequests = ipRequests.filter(time => now - time < config.blacklist.windowMs);
    if (hourlyRequests.length >= config.blacklist.threshold) {
        blacklistedIps.set(ip, now + config.blacklist.durationMs);
        console.warn(`IP ${ip} blacklisted for 1 hour.`);
        return res.status(429).json({ error: "Suspicious activity. IP temporarily blocked." });
    }

    // 3. Check Global Limit
    if (globalRequests.length >= config.globalLimit.requests) {
        return res.status(429).json({ error: "Service temporarily overloaded. Please try again later." });
    }
    
    // --- MODIFIED: The Per-IP and Burst checks now include setting headers ---
    const ipMinuteRequests = ipRequests.filter(time => now - time < config.ipLimit.windowMs);
    const ipBurstRequests = ipRequests.filter(time => now - time < config.burstLimit.windowMs);
    
    // Calculate the reset time based on the oldest request in the window
    const firstRequestTime = ipMinuteRequests[0] || now;
    const resetTime = new Date(firstRequestTime + config.ipLimit.windowMs);

    // Set the headers for every request
    res.set({
        'X-RateLimit-Limit': config.ipLimit.requests,
        'X-RateLimit-Remaining': Math.max(0, config.ipLimit.requests - ipMinuteRequests.length - 1),
        'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000) // Unix timestamp in seconds
    });

    // 4. Check Per-IP Limit
    if (ipMinuteRequests.length >= config.ipLimit.requests) {
        res.set('X-RateLimit-Remaining', 0); // Ensure remaining is 0 on the error response
        console.log(chalk.red(`IP limit exceeded for IP ${ip}`));
        return res.status(429).json({ error: "Too many requests from this IP. Try again in a minute." });
    }

    // 5. Check Burst Limit
    if (ipBurstRequests.length >= config.burstLimit.requests) {
        console.log(chalk.yellow(`Burst limit exceeded for IP ${ip}`));
        return res.status(429).json({ error: "Too many requests too quickly. Please slow down." });
    }
    // --- END OF MODIFICATION ---

    // If all checks pass, record the request and proceed
    ipRequests.push(now);
    requestsByIp.set(ip, ipRequests);
    globalRequests.push(now);

    next();
};

export default rateLimiter;