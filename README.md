# Go Docs MCP

Model Context Protocol (MCP) server that provides up-to-date documentation for the Go programming language standard library and builtin functions.

This project has been converted from a Zig documentation server to work with Go documentation. It provides access to Go's builtin functions and standard library documentation through MCP tools.

> [!TIP]
> Add `use godocs` to your prompt if you want to explicitly instruct the LLM to use Go docs tools. Otherwise, LLM will automatically decide when to utilize MCP tools based on the context of your questions.

## Features

- **Go Builtin Functions**: Access documentation for all Go builtin functions like `len()`, `cap()`, `make()`, `new()`, `append()`, `copy()`, `delete()`, `complex()`, `real()`, `imag()`, `panic()`, and `recover()`.
- **Standard Library Search**: Search through Go's standard library packages and functions.
- **Detailed Documentation**: Get comprehensive documentation including function signatures, parameters, return types, and usage examples.
- **Web Interface**: Local web server for browsing documentation.

## Installation

### Prerequisites

- Node.js 18+ or Bun 1.0+
- TypeScript compiler

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd go-mcp
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Build the project:
```bash
npm run build
# or
bun run build
```

## Usage

### MCP Server

Start the MCP server:

```bash
# Using Node.js
node dist/mcp.js

# Using Bun
bun dist/mcp.js
```

### CLI Commands

```bash
# Start MCP server with defaults (go1.21 version)
go-mcp

# Use specific Go version
go-mcp --version go1.20

# Enable automatic daily updates
go-mcp --update-policy daily

# Update documentation without starting server
go-mcp update --version go1.22

# Start local web server to view documentation
go-mcp view --version go1.21
```

### MCP Configuration

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "go-docs": {
      "command": "node",
      "args": ["dist/mcp.js", "--version", "go1.21", "--update-policy", "manual"]
    }
  }
}
```

## Tools

- **`list_builtin_functions`** - Lists all available Go builtin functions with their signatures and descriptions.
- **`get_builtin_function`** - Search for Go builtin functions by name and get detailed documentation.
- **`search_std_lib`** - Search the Go standard library for packages and functions.
- **`get_std_lib_item`** - Get detailed documentation for a specific standard library item.

## Development

### Project Structure

```
go-mcp/
├── mcp/                    # Source code
│   ├── mcp.ts             # Main MCP server
│   ├── docs.ts            # Documentation handling
│   ├── tools.ts           # MCP tools implementation
│   ├── std.ts             # Standard library parser
│   ├── extract-builtin-functions.ts  # Builtin functions extraction
│   ├── index.html         # Web interface
│   └── std.js             # Web interface JavaScript
├── dist/                  # Compiled output
├── package.json           # Project configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Build Commands

```bash
# Build the project
npm run build

# Development mode with inspector
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix
```

## Version Support

The server supports various Go versions:
- `go1.21` (default)
- `go1.20`, `go1.19`, etc.

## Cache

Documentation is cached in platform-specific directories:
- Linux: `~/.cache/go-mcp/`
- macOS: `~/Library/Caches/go-mcp/`
- Windows: `%LOCALAPPDATA%\go-mcp\`

## Contributing

This project has been converted from a Zig documentation server. The current implementation provides basic Go documentation functionality. Future improvements could include:

- Full Go source code parsing
- More comprehensive standard library coverage
- Better search algorithms
- Integration with Go's official documentation APIs

## License

MIT License - see LICENSE file for details.
