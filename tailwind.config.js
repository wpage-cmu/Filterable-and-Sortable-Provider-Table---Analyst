export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Lato', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['26px', { lineHeight: '1.2', fontWeight: '600' }],
        'body1': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body2': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'body3': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'note': ['12px', { lineHeight: '1.3', fontWeight: '400' }],
      }
    }
  }
}