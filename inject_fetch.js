const fs = require('fs');
const path = require('path');

const fetchInterceptor = `
// Interceptador de Fetch para injetar Token JWT
if (!window.fetchIntercepted) {
    const originalFetch = window.fetch;
    window.fetch = async function () {
        let [resource, config] = arguments;
        if(!config) config = {};
        
        // Trata o caso em que headers é um Headers object nativo
        if (config.headers instanceof Headers) {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.append("Authorization", "Bearer " + token);
            }
        } else {
            if(!config.headers) config.headers = {};
            const token = localStorage.getItem("token");
            if(token) {
                config.headers["Authorization"] = "Bearer " + token;
            }
        }
        
        return originalFetch(resource, config);
    };
    window.fetchIntercepted = true;
}
`;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('window.fetchIntercepted')) {
                fs.writeFileSync(fullPath, fetchInterceptor + '\n' + content);
            }
        }
    }
}

processDir('c:\\\\Users\\\\RD\\\\Documents\\\\AgendaRosa\\\\agendarosa\\\\agendarosa\\\\frontend');
console.log('Finalizado.');
