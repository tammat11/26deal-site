import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'deploy-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/deploy' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const { residents, events } = data;

                // 1. Update files
                if (residents) {
                  const residentsPath = path.resolve(__dirname, 'src/data/residents.js');
                  const residentsContent = `export const residents = ${JSON.stringify(residents, null, 4)};\n`;
                  fs.writeFileSync(residentsPath, residentsContent);
                }

                if (events) {
                  const eventsPath = path.resolve(__dirname, 'src/data/events.js');
                  const eventsContent = `export const events = ${JSON.stringify(events, null, 4)};\n`;
                  fs.writeFileSync(eventsPath, eventsContent);
                }

                // 2. Git Commit & Push
                console.log('Starting Deployment to GitHub...');
                execSync('git add .');
                execSync('git commit -m "Admin panel update: residents and events"');
                execSync('git push origin main');
                console.log('Successfully deployed to GitHub');

                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, message: 'Changes synchronized and pushed to GitHub' }));
              } catch (error) {
                console.error('Deployment Error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, message: error.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
