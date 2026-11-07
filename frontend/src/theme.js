import { createTheme } from '@mui/material/styles';

export const cafeTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E06D53', // テラコッタ・ウォームコーラル（食欲をそそる温かいオレンジ）
      light: '#F49D85',
      dark: '#BA4E36',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E9C46A', // 温かみのあるマスタードイエロー
      light: '#F4D990',
      dark: '#C89E39',
      contrastText: '#4A3B32',
    },
    background: {
      default: '#FBF8F5', // カフェのミルク・生成り色（冷たいグレーからの脱却）
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3D342F', // 真っ黒ではなく、深みのあるエスプレッソブラウン
      secondary: '#7A6E65',
    },
    divider: '#EFEAE4',
  },
  typography: {
    fontFamily: [
      '"M PLUS Rounded 1c"', // ポップでかわいい丸文字 Google Fonts
      '"Hiragino Maru Gothic ProN"', // macOS / iOS 向け丸ゴシック
      '-apple-system',
      'BlinkMacSystemFont',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 800,
      color: '#3D342F',
      letterSpacing: '0.02em',
    },
    h6: {
      fontWeight: 700,
      color: '#3D342F',
      letterSpacing: '0.01em',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none', // 英語の大文字強制を解除して柔らかく
    },
  },
  shape: {
    borderRadius: 16, // 全体的に丸みを帯びたフォルム
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FBF8F5',
          color: '#3D342F',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#3D342F',
          boxShadow: '0 2px 12px rgba(61, 52, 47, 0.05)', // ふんわりとした薄い影
          borderBottom: '1px solid #EFEAE4',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid #F0ECE6',
          boxShadow: '0 4px 16px rgba(61, 52, 47, 0.04)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-3px)', // 触って楽しい浮き上がりアニメーション
            boxShadow: '0 8px 24px rgba(224, 109, 83, 0.12)',
            borderColor: '#F49D85',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24, // コロンとしたピル型ボタン
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(224, 109, 83, 0.25)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #E06D53 0%, #E87A63 100%)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          boxShadow: '0 6px 20px rgba(224, 109, 83, 0.35)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#E8E1D9',
            },
            '&:hover fieldset': {
              borderColor: '#E06D53',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
        },
      },
    },
  },
});
