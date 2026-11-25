/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"微软雅黑"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          DEFAULT: '#165DFF',
          hover: '#4080FF',
          active: '#0E42D2',
          light: '#E8F3FF',
          dark: '#002B99'
        },
        ai: {
          DEFAULT: '#722ED1',
          hover: '#9254DE',
          light: '#F9F0FF'
        },
        primary: {
          DEFAULT: '#2563EB',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f1f4f9',
          foreground: '#374151',
        },
        muted: {
          DEFAULT: '#f1f4f9',
          foreground: '#6b7280',
        },
        accent: {
          DEFAULT: '#eef1fe',
          foreground: '#4b56cc',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#2563eb',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937',
        },
      },
      boxShadow: {
        'arco-1': '0 2px 5px rgba(0, 0, 0, 0.05)',
        'arco-2': '0 4px 10px rgba(0, 0, 0, 0.08)',
        'arco-3': '0 8px 20px rgba(0, 0, 0, 0.12)',
        'arco-4': '0 12px 30px rgba(0, 0, 0, 0.15)',
      },
      spacing: {
        'para': '21px', // WCAG AAA 14px * 1.5 = 21px
      }
    },
  },
  plugins: [],
}
