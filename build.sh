#!/bin/bash

# Simple build script for Fonternate Extension
# This creates a basic working version without Node.js dependencies

echo "Building Fonternate Extension..."

# Create dist directory
mkdir -p dist

# Copy static files
cp manifest.json dist/
cp popup.html dist/
cp icon*.png dist/

# Create a simple popup.js that works without React for now
cat > dist/popup.js << 'EOF'
// Simple popup implementation for Fonternate
document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('root');
  
  if (root) {
    root.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400&display=swap');
        
        body {
          font-family: 'Roboto Mono', monospace;
          background: white;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .popup-content {
          padding: 8px;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .input-section {
          width: 100%;
        }
        
        .font-input {
          background: #F2F2F2;
          border: none;
          padding: 4px;
          font-family: 'Roboto Mono', monospace;
          font-size: 14px;
          color: #B5B5B5;
          width: 100%;
          box-sizing: border-box;
        }
        
        .font-input:focus {
          outline: none;
          color: black;
        }
        
        .font-input::placeholder {
          color: #B5B5B5;
        }
        
        .font-error {
          color: #dc2626;
          font-size: 12px;
          font-family: 'Roboto Mono', monospace;
          margin-top: 2px;
          margin-bottom: 4px;
          display: none;
        }
        
        .font-error.show {
          display: block;
        }
        
        .apply-button {
          background: black;
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: 20px;
          font-family: 'Roboto Mono', monospace;
          font-size: 14px;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          width: calc(50% - 2px);
        }
        
        .apply-button:hover {
          background: #333;
        }
        
        .apply-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .reset-button {
          background: transparent;
          color: black;
          border: 1px solid black;
          padding: 4px 12px;
          border-radius: 20px;
          font-family: 'Roboto Mono', monospace;
          font-size: 14px;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          width: calc(50% - 2px);
        }
        
        .reset-button:hover {
          background: #f0f0f0;
        }
        
        .opentype-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin: 4px 0;
        }
        
        .opentype-block {
          background: #F2F2F2;
          padding: 4px;
          cursor: pointer;
          border: none;
          font-family: 'Roboto Mono', monospace;
          font-size: 12px;
          text-transform: uppercase;
          color: black;
          min-height: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: stretch;
          text-align: left;
        }
        
        .opentype-block:hover {
          background: #e8e8e8;
        }
        
        .opentype-block.active {
          background: black;
          color: white;
        }
        
        .opentype-label {
          font-weight: bold;
          margin-bottom: 2px;
          text-align: left;
        }
        
        .opentype-status {
          font-size: 13px;
          text-align: right;
          font-weight: bold;
        }
        
        .button-section {
          display: flex;
          gap: 4px;
          width: 100%;
          margin-top: 4px;
        }
      </style>
      
      <div class="popup-content">
        <!-- Input Section -->
        <div class="input-section">
          <input 
            type="text" 
            id="fontInput"
            placeholder="ENTER FONT NAME HERE"
            class="font-input"
          >
          <div id="fontError" class="font-error">
            Font not found
          </div>
        </div>

        <!-- OpenType Features Grid -->
        <div class="opentype-grid">
          <button id="ss01Btn" class="opentype-block">
            <div class="opentype-label">STYLISTIC SETS</div>
            <div class="opentype-status" id="ss01Status">OFF</div>
          </button>
          
          <button id="swshBtn" class="opentype-block">
            <div class="opentype-label">SWASHES</div>
            <div class="opentype-status" id="swshStatus">OFF</div>
          </button>
          
          <button id="caltBtn" class="opentype-block">
            <div class="opentype-label">CONTEXTUAL ALTERNATES</div>
            <div class="opentype-status" id="caltStatus">OFF</div>
          </button>
          
          <button id="dligBtn" class="opentype-block">
            <div class="opentype-label">DISCRET. LIGATURES</div>
            <div class="opentype-status" id="dligStatus">OFF</div>
          </button>
        </div>

        <!-- Button Section -->
        <div class="button-section">
          <button id="applyBtn" class="apply-button">
            APPLY
          </button>
          <button id="resetBtn" class="reset-button">
            RESET
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    setupEventListeners();
  }
});

function setupEventListeners() {
  const fontInput = document.getElementById('fontInput');
  const applyBtn = document.getElementById('applyBtn');
  const resetBtn = document.getElementById('resetBtn');
  const fontError = document.getElementById('fontError');
  const ss01Btn = document.getElementById('ss01Btn');
  const swshBtn = document.getElementById('swshBtn');
  const caltBtn = document.getElementById('caltBtn');
  const dligBtn = document.getElementById('dligBtn');
  const ss01Status = document.getElementById('ss01Status');
  const swshStatus = document.getElementById('swshStatus');
  const caltStatus = document.getElementById('caltStatus');
  const dligStatus = document.getElementById('dligStatus');

  // Load saved settings
  chrome.storage.sync.get(['fontSettings'], function(result) {
    if (result.fontSettings) {
      if (result.fontSettings.fontFamily) {
        fontInput.value = result.fontSettings.fontFamily;
      }
      if (result.fontSettings.openTypeFeatures) {
        updateButtonStates(result.fontSettings.openTypeFeatures);
      }
    }
  });

  function validateFont(fontFamily) {
    // Create a temporary element to test font availability
    const testElement = document.createElement('span');
    testElement.style.fontFamily = fontFamily + ', monospace';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontSize = '72px';
    testElement.textContent = 'abcdefghijklmnopqrstuvwxyz';
    
    document.body.appendChild(testElement);
    
    // Get the computed font family
    const computedFont = window.getComputedStyle(testElement).fontFamily;
    
    // Clean up
    document.body.removeChild(testElement);
    
    // Check if the font was actually applied (not fallback to monospace)
    return computedFont.toLowerCase().includes(fontFamily.toLowerCase());
  }

  function showFontError() {
    fontError.classList.add('show');
  }

  function hideFontError() {
    fontError.classList.remove('show');
  }

  function updateButtonStates(openTypeFeatures) {
    // Update ss01
    if (openTypeFeatures.ss01) {
      ss01Btn.classList.add('active');
      ss01Status.textContent = 'ON';
    } else {
      ss01Btn.classList.remove('active');
      ss01Status.textContent = 'OFF';
    }
    
    // Update swsh
    if (openTypeFeatures.swsh) {
      swshBtn.classList.add('active');
      swshStatus.textContent = 'ON';
    } else {
      swshBtn.classList.remove('active');
      swshStatus.textContent = 'OFF';
    }
    
    // Update calt
    if (openTypeFeatures.calt) {
      caltBtn.classList.add('active');
      caltStatus.textContent = 'ON';
    } else {
      caltBtn.classList.remove('active');
      caltStatus.textContent = 'OFF';
    }
    
    // Update dlig
    if (openTypeFeatures.dlig) {
      dligBtn.classList.add('active');
      dligStatus.textContent = 'ON';
    } else {
      dligBtn.classList.remove('active');
      dligStatus.textContent = 'OFF';
    }
  }

  // Apply font
  function applyFont() {
    const fontFamily = fontInput.value.trim();
    if (!fontFamily) return;

    // Validate font
    const isFontValid = validateFont(fontFamily);
    if (!isFontValid) {
      showFontError();
      return; // Don't apply if font is not found
    }

    hideFontError();

    const settings = {
      fontFamily: fontFamily,
      isEnabled: true,
      openTypeFeatures: {
        ss01: ss01Btn.classList.contains('active'),
        ss02: false, ss03: false, ss04: false, ss05: false,
        ss06: false, ss07: false, ss08: false, ss09: false, ss10: false,
        ss11: false, ss12: false, ss13: false, ss14: false, ss15: false,
        ss16: false, ss17: false, ss18: false, ss19: false, ss20: false,
        swsh: swshBtn.classList.contains('active'),
        calt: caltBtn.classList.contains('active'),
        dlig: dligBtn.classList.contains('active')
      }
    };

    // Save to storage
    chrome.storage.sync.set({ fontSettings: settings });

    // Apply to current page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_FONT_SETTINGS',
          payload: settings
        });
      }
    });
  }

  // Reset fonts
  function resetFonts() {
    const settings = {
      fontFamily: fontInput.value.trim(),
      isEnabled: false,
      openTypeFeatures: {
        ss01: ss01Btn.classList.contains('active'),
        ss02: false, ss03: false, ss04: false, ss05: false,
        ss06: false, ss07: false, ss08: false, ss09: false, ss10: false,
        ss11: false, ss12: false, ss13: false, ss14: false, ss15: false,
        ss16: false, ss17: false, ss18: false, ss19: false, ss20: false,
        swsh: swshBtn.classList.contains('active'),
        calt: caltBtn.classList.contains('active'),
        dlig: dligBtn.classList.contains('active')
      }
    };

    // Clear font error when resetting
    hideFontError();

    chrome.storage.sync.set({ fontSettings: settings });

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'RESET_FONTS'
        });
      }
    });
  }

  // Toggle OpenType feature
  function toggleOpenTypeFeature(button, statusElement, featureKey) {
    const isActive = button.classList.contains('active');
    
    if (isActive) {
      button.classList.remove('active');
      statusElement.textContent = 'OFF';
    } else {
      button.classList.add('active');
      statusElement.textContent = 'ON';
    }
    
    // Update settings and re-apply
    const settings = {
      fontFamily: fontInput.value.trim(),
      isEnabled: true,
      openTypeFeatures: {
        ss01: ss01Btn.classList.contains('active'),
        ss02: false, ss03: false, ss04: false, ss05: false,
        ss06: false, ss07: false, ss08: false, ss09: false, ss10: false,
        ss11: false, ss12: false, ss13: false, ss14: false, ss15: false,
        ss16: false, ss17: false, ss18: false, ss19: false, ss20: false,
        swsh: swshBtn.classList.contains('active'),
        calt: caltBtn.classList.contains('active'),
        dlig: dligBtn.classList.contains('active')
      }
    };

    chrome.storage.sync.set({ fontSettings: settings });

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_FONT_SETTINGS',
          payload: settings
        });
      }
    });
  }

  // Event listeners
  applyBtn.addEventListener('click', applyFont);
  resetBtn.addEventListener('click', resetFonts);
  fontInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      applyFont();
    }
  });

  // Clear font error when user starts typing
  fontInput.addEventListener('input', function() {
    if (fontError.classList.contains('show')) {
      hideFontError();
    }
  });

  // OpenType feature buttons
  ss01Btn.addEventListener('click', () => toggleOpenTypeFeature(ss01Btn, ss01Status, 'ss01'));
  swshBtn.addEventListener('click', () => toggleOpenTypeFeature(swshBtn, swshStatus, 'swsh'));
  caltBtn.addEventListener('click', () => toggleOpenTypeFeature(caltBtn, caltStatus, 'calt'));
  dligBtn.addEventListener('click', () => toggleOpenTypeFeature(dligBtn, dligStatus, 'dlig'));
}
EOF

# Create a simple content script
cat > dist/content.js << 'EOF'
// Simple content script for font override
let styleElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'UPDATE_FONT_SETTINGS') {
    applyFont(message.payload);
  } else if (message.type === 'RESET_FONTS') {
    resetFonts();
  }
});

function applyFont(settings) {
  if (!settings.fontFamily) return;

  // Remove existing style if present
  resetFonts();

  // Create and inject style element
  styleElement = document.createElement('style');
  styleElement.id = 'font-override-style';
  
  // Build CSS with font-family and optional font-feature-settings
  let css = `* { font-family: "${settings.fontFamily}", sans-serif !important;`;
  
  // Add font-feature-settings if any OpenType features are enabled
  const enabledFeatures = getEnabledOpenTypeFeatures(settings.openTypeFeatures);
  if (enabledFeatures.length > 0) {
    css += ` font-feature-settings: ${enabledFeatures.map(f => `"${f}"`).join(', ')} !important;`;
  }
  
  css += ' }';
  
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
}

function getEnabledOpenTypeFeatures(openTypeFeatures) {
  if (!openTypeFeatures) return [];
  
  const features = [];
  
  // Add enabled stylistic sets (ss01-ss20)
  for (let i = 1; i <= 20; i++) {
    const ssKey = 'ss' + i.toString().padStart(2, '0');
    if (openTypeFeatures[ssKey]) {
      features.push(ssKey);
    }
  }
  
  // Add other OpenType features
  if (openTypeFeatures.swsh) features.push('swsh');
  if (openTypeFeatures.calt) features.push('calt');
  if (openTypeFeatures.dlig) features.push('dlig');
  
  return features;
}

function resetFonts() {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
}
EOF

# Create a simple background script
cat > dist/background.js << 'EOF'
// Simple background script for font override
chrome.runtime.onInstalled.addListener(function() {
  console.log('Fonternate Extension installed');
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
  if (command === '_execute_action') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'RESET_FONTS'
        });
      }
    });
  }
});

// Handle messages
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'GET_FONT_SETTINGS') {
    chrome.storage.sync.get(['fontSettings'], function(result) {
      sendResponse(result.fontSettings || {});
    });
    return true;
  } else if (message.type === 'UPDATE_FONT_SETTINGS') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
    sendResponse({success: true});
  } else if (message.type === 'RESET_FONTS') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
    sendResponse({success: true});
  }
});
EOF

echo "Build complete! Extension files are in the 'dist' directory."
echo ""
echo "To install the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the 'dist' folder"
echo ""
echo "This is a simplified version focused only on font family override with OpenType features."
echo "For the full React/TypeScript version, run 'npm run build'" 