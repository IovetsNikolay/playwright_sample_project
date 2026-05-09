import { test } from '@playwright/test';

export const skipIfWebkit = (message: string = 'Not supported for Safari/WebKit') => {
  test.skip(() => test.info().project.name.includes('webkit'), message);
};

export const skipIfFirefox = (message: string = 'Not supported for Firefox') => {
  test.skip(() => test.info().project.name.includes('firefox'), message);
};

export const skipIfChromium = (message: string = 'Not supported for Chromium/Chrome') => {
  test.skip(() => test.info().project.name.includes('chromium'), message);
};

export const skipIfProject = (projectName: string, message?: string) => {
  test.skip(() => test.info().project.name.includes(projectName), message || `Not supported for ${projectName}`);
};

export const skipIfNotProject = (projectName: string, message?: string) => {
  test.skip(() => !test.info().project.name.includes(projectName), message || `Test only runs in ${projectName}`);
};

export const skipIfMobileChrome = (message: string = 'Not supported for Mobile Chrome') => {
  test.skip(() => test.info().project.name.includes('mobile-chrome'), message);
};

export const skipIfMobileSafari = (message: string = 'Not supported for Mobile Safari') => {
  test.skip(() => test.info().project.name.includes('mobile-safari'), message);
};

export const skipIfMobile = (message: string = 'Not supported on mobile devices') => {
  test.skip(() => test.info().project.name.includes('mobile'), message);
};
