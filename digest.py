import os

# Files to ignore (dependencies, binaries, system files)
IGNORE_DIRS = {'node_modules', 'venv', '.git', '__pycache__', 'dist', 'build', '.vscode', '.idea'}
IGNORE_FILES = {'package-lock.json', 'yarn.lock', '.DS_Store', 'digest.py'}
# Only include these file extensions (add more if needed)
INCLUDE_EXTS = {'.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.sql', '.json'}

def create_digest():
    output_file = "codebase_summary.txt"
    
    with open(output_file, "w", encoding="utf-8") as outfile:
        # Walk through all directories
        for root, dirs, files in os.walk("."):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                # Check extension
                _, ext = os.path.splitext(file)
                if ext in INCLUDE_EXTS:
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, "r", encoding="utf-8") as infile:
                            content = infile.read()
                            
                            # Write file header and content to the summary
                            outfile.write(f"\n{'='*50}\n")
                            outfile.write(f"FILE: {file_path}\n")
                            outfile.write(f"{'='*50}\n")
                            outfile.write(content + "\n")
                            print(f"Added: {file_path}")
                    except Exception as e:
                        print(f"Skipping {file_path}: {e}")

    print(f"\nDone! All code saved to '{output_file}'. You can upload this file.")

if __name__ == "__main__":
    create_digest()