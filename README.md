# Lockbox - API Key Vault for VS Code

Encrypted API key vault for developers. Store, access, and manage your API keys securely from VS Code.

## Features

- Securely store and manage API keys in encrypted vaults
- Copy keys to clipboard with automatic clearing
- Search across all vaults
- Insert key references or values directly into your code
- Import keys from `.env` files
- CodeLens support for `lockbox://` references
- Audit log for key access tracking
- Tree view with vault and key management
- Status bar integration

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Sign in to your Lockbox account via the sidebar
3. Create a vault and start adding keys

## Usage

- **Copy a key**: `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (macOS)
- **Search keys**: Open the Command Palette and run `Lockbox: Search Keys`
- **Add a key**: Click the `+` icon in the Vaults tree view
- **Import from .env**: Run `Lockbox: Import Keys from .env File` from the Command Palette

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `lockbox.dashboardUrl` | `https://dashboard.yourlockbox.dev` | URL of the Lockbox dashboard |
| `lockbox.autoRefreshInterval` | `300` | Auto-refresh interval in seconds (0 to disable) |
| `lockbox.clipboardClearTimeout` | `30` | Clear clipboard after copying a key (seconds, 0 to disable) |
| `lockbox.showCodeLens` | `true` | Show CodeLens on `lockbox://` references |
| `lockbox.showEnvSuggestions` | `true` | Show suggestions to store .env keys in Lockbox |
| `lockbox.showStatusBar` | `true` | Show Lockbox status in the status bar |

## License

MIT - see [LICENSE](LICENSE) for details.
