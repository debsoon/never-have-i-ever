import localFont from 'next/font/local'

export const txcPearl = localFont({
  src: '../../public/fonts/TXCPearl-Regular.ttf',
  variable: '--font-txc-pearl'
})

export const neuzeitGrotesk = localFont({
  src: [
    {
      path: '../../public/fonts/Neuzeit-Grotesk-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Neuzeit-Grotesk-Bold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-neuzeit-grotesk'
})

export const p22Freely = localFont({
  src: '../../public/fonts/P22-Freely-Regular.ttf',
  variable: '--font-handwritten'
}) 