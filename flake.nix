{
  description = "Force-directed graph layout in 1D, 2D or 3D";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, treefmt-nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        treefmtEval = treefmt-nix.lib.evalModule pkgs {
          projectRootFile = "flake.nix";
          programs = {
            prettier = {
              enable = true;
              package = pkgs.prettier;
              includes = [ "*.js" "*.ts" "*.json" "*.md" "*.yaml" "*.yml" ];
            };
            nixpkgs-fmt.enable = true;
          };
        };
      in
      {
        formatter = treefmtEval.config.build.wrapper;

        checks = {
          formatting = treefmtEval.config.build.check self;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            pnpm

            treefmtEval.config.build.wrapper
            nixpkgs-fmt

            git
            direnv
          ];
        };
      });
}
