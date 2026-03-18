# Releases

Store project release archives (`.zip`, `.tar.gz`) here.

Large files (> 50 MB) are tracked with **Git LFS** via `.gitattributes`.

## Uploading a release archive

### Via GitHub web interface
1. Navigate to this folder on GitHub
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop your `.zip` file and commit

### Via command line
```bash
# Make sure Git LFS is installed: https://git-lfs.com/
git lfs install
cp /path/to/your-project.zip releases/
git add releases/your-project.zip
git commit -m "Add project release archive"
git push
```
