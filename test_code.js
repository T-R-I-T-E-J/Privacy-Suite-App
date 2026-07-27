// Test code for AI Code Review
function processUserInput(input) {
    // Potential XSS vulnerability
    document.getElementById('output').innerHTML = input;
    
    // SQL injection vulnerability
    const query = "SELECT * FROM users WHERE name = '" + input + "'";
    
    // Hardcoded credentials
    const apiKey = "sk_live_1234567890abcdef";
    
    return query;
}
    