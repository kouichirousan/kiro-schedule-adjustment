declare global {
  interface Window {
    // Google Calendar API
    gapi: any
    // Google Sign-In API
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: () => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

export {}