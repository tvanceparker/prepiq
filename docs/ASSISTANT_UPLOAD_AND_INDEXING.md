# Assistant Upload And Indexing

## Supported Phase 1 Sources

- `docs/`
- `notes/`
- uploaded `.md`, `.txt`, and `.pdf` files

Current live note:

- built-in `docs/` and `notes/` sources are indexed lazily through the assistant backend
- uploaded files are live through `/assistant/documents/upload`
- uploaded sources are stored on the server and indexed per restaurant

## Not In Phase 1

- OCR-heavy scans
- arbitrary binary files
- spreadsheet indexing
- document authoring workflows

## Live Upload Flow

1. user uploads a supported file through an assistant upload endpoint
2. backend stores file metadata in the application database
3. backend stores the file in a server-managed upload location for phase 1
4. indexing service extracts text and creates chunks
5. chunks are embedded with OpenAI and written to assistant chunk storage in the application database
6. uploaded source becomes searchable through document retrieval

## Live Metadata

- file name
- content type
- source path or storage reference
- checksum
- upload timestamp
- restaurant scope when tenant-bound
- indexing status
- last indexed timestamp

## Storage Direction

Phase 1 uses local server-managed storage with a clear abstraction.

Future direction:

- move uploaded files to object storage
- keep metadata in the application database
- move vectors to a dedicated vector backend if retrieval scale or latency requires it

## Operational Notes

- uploaded files should be indexable without exposing raw OpenAI keys to clients
- restaurant-bound uploads must never cross tenant boundaries during retrieval
- reindexing should be checksum-aware so unchanged files are not repeatedly embedded
