{
  inputs.nixpkgs.url = "nixpkgs";

  outputs =
    { self, nixpkgs }:
    {
      devShells.x86_64-linux.default =
        let
          pkgs = import nixpkgs { system = "x86_64-linux"; };
        in
        pkgs.mkShell {
          buildInputs = [ pkgs.nodejs_23 ];
          shellHook = ''
            alias serve="npm run serve"
            alias build="npm run build"
            alias prepare-dev="npm run prepare-dev"
            alias sync-files="npm run sync-files"
            alias watch="npm run watch"
            alias update-pages="npm run update-pages"
            alias clean="npm run clean"
            
            cat <<EOF

            Available commands:
             serve        - Start development server
             build        - Build the project
             prepare-dev  - Prepare development environment
             sync-files   - Synchronize files
             watch        - Watch for changes
             update-pages - Update pages
             clean        - Clean build directory

            EOF
            git pull
          '';
        };
    };
}
