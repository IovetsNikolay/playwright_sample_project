import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 0,
  testDir: './tests',
  testMatch: '**/tests/**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: '90%',
  reporter: [
    ['html', { outputDir: 'playwright-report', open: 'never' }],
    ['list']
  ],

  use: {
    headless: !!process.env.CI,
    baseURL: process.env.BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

// npm install                        # install from existing package.json
// npm install -D @faker-js/faker     # if using faker                                                                                                                                                           
// npm install dotenv                 # if using .env files             

// Install browser binaries                                                                                                                                                                                    
// npx playwright install             # all browsers                                                                                                                                                             
// npx playwright install chromium    # chromium only       
//npm init playwright@latest

// Run tests                              
// npx playwright test                          # all tests                                                                                                                                                      
// npx playwright test tests/example.spec.ts   # specific file                                                                                                                                                 
// npx playwright test --headed                # visible browser
// npx playwright test --project=chromium      # specific browser                                                                                                                                                
// npx playwright test --grep "login"          # by test name pattern
// npx playwright test --ui                    # interactive UI mode                                                                                                                                             

//  Report                                                                                                                                                                                                        
// npx playwright show-report                                                                                                                                                                                    
                                                                                                                                                                                                              
// Git — init and connect to remote       
// git init                                                                                                                                                                                                      
// git add .                              
// git commit -m "init"                                                                                                                                                                                          
// git remote add origin https://github.com/your-username/your-repo.git                                                                                                                                        
// git branch -M main                   
// git push -u origin main                                                                                                                                                                                       
                                      
// Git — day-to-day                                                                                                                                                                                              
// git status                                                                                                                                                                                                  
// git add .                            
// git commit -m "message"                                                                                                                                                                                       
// git push                              
