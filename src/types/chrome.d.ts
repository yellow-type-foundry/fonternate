declare namespace chrome {
  namespace runtime {
    function sendMessage(message: any, callback?: (response: any) => void): void;
    const lastError: chrome.runtime.LastError | undefined;
    const onMessage: chrome.runtime.RuntimeMessageEvent;
    const onInstalled: chrome.runtime.RuntimeInstalledEvent;
  }

  namespace storage {
    namespace sync {
      function get(keys: string[]): Promise<any>;
      function set(items: any): Promise<void>;
    }
  }

  namespace commands {
    const onCommand: chrome.commands.CommandEvent;
  }

  namespace tabs {
    function query(queryInfo: any): Promise<chrome.tabs.Tab[]>;
    function sendMessage(tabId: number, message: any): void;
  }
}

declare namespace chrome.runtime {
  interface LastError {
    message: string;
  }
  
  interface RuntimeMessageEvent {
    addListener(callback: (message: any, sender: any, sendResponse: any) => void): void;
  }
  
  interface RuntimeInstalledEvent {
    addListener(callback: (details: any) => void): void;
  }
}

declare namespace chrome.commands {
  interface CommandEvent {
    addListener(callback: (command: string) => void): void;
  }
}

declare namespace chrome.tabs {
  interface Tab {
    id?: number;
    active?: boolean;
    currentWindow?: boolean;
  }
} 