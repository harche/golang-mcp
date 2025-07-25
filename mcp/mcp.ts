#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { downloadSourcesTar, ensureDocs, startViewServer, type UpdatePolicy } from "./docs.js";
import { registerAllTools } from "./tools.js";

interface CLIOptions {
    version: string;
    updatePolicy: UpdatePolicy;
    command?: "update" | "view";
}

function parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
        version: "go1.21",
        updatePolicy: "manual",
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "update") {
            options.command = "update";
        } else if (arg === "view") {
            options.command = "view";
        } else if (arg === "--version" && i + 1 < args.length) {
            options.version = args[++i];
        } else if (arg === "--update-policy" && i + 1 < args.length) {
            const policy = args[++i];
            if (policy === "manual" || policy === "daily" || policy === "startup") {
                options.updatePolicy = policy;
            } else {
                console.error(
                    `Invalid update policy: ${policy}. Must be one of: manual, daily, startup`,
                );
                process.exit(1);
            }
        } else if (arg === "--help" || arg === "-h") {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp() {
    console.log(`Usage: go-mcp [options] [command]

Commands:
  update                                    Update documentation without starting MCP server
  view                                      Start local web server to view documentation

Options:
  --version <version>                       Go version to use (default: go1.21)
                                            Examples: go1.21, go1.20, go1.19
  --update-policy <policy>                  Update policy (default: manual)
                                            Options: manual, daily, startup
  -h, --help                                Show this help message

Examples:
  go-mcp                                   # Start MCP server with go1.21 version
  go-mcp --version go1.20                  # Start with specific version
  go-mcp --update-policy daily             # Auto-update daily on startup
  go-mcp update --version go1.22           # Update docs to specific version
  go-mcp view --version go1.21             # View documentation for specific version`);
}

async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.command === "update") {
        try {
            await ensureDocs(options.version, "startup", false);
            process.exit(0);
        } catch {
            process.exit(1);
        }
    }

    if (options.command === "view") {
        try {
            await startViewServer(options.version);
            return;
        } catch {
            process.exit(1);
        }
    }

    const builtinFunctions = await ensureDocs(options.version, options.updatePolicy, true);
    const stdSources = await downloadSourcesTar(options.version, true);

    const mcpServer = new McpServer({
        name: "GoDocs",
        description:
            "Retrieves up-to-date documentation for the Go programming language standard library and builtin functions.",
        version: options.version,
    });

    registerAllTools(mcpServer, builtinFunctions, stdSources);

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
}

main().catch((error) => {
    if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
    } else {
        console.error("An unexpected error occurred");
    }
    process.exit(1);
});
