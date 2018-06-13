// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// This file was generated by a tool. Modifying this file will produce unexpected behavior.
//
// This script is used to install and invoke a tool from a CI definition.

import * as childProcess from 'child_process';

import {
  installAndRun,
  IPackageSpecifier,
  getNpmPath,
  runWithErrorPrinting
} from './install-run-common';

/**
 * Parse a package specifier (in the form of name\@version) into name and version parts.
 */
function parsePackageSpecifier(rawPackageSpecifier: string): IPackageSpecifier {
  rawPackageSpecifier = (rawPackageSpecifier || '').trim();
  const separatorIndex: number = rawPackageSpecifier.lastIndexOf('@');

  let name: string;
  let version: string | undefined = undefined;
  if (separatorIndex === 0) {
    // The specifier starts with a scope and doesn't have a version specified
    name = rawPackageSpecifier;
  } else if (separatorIndex === -1) {
    // The specifier doesn't have a version
    name = rawPackageSpecifier;
  } else {
    name = rawPackageSpecifier.substring(0, separatorIndex);
    version = rawPackageSpecifier.substring(separatorIndex + 1);
  }

  if (!name) {
    throw new Error(`Invalid package specifier: ${rawPackageSpecifier}`);
  }

  return { name, version };
}
/**
 * Resolve a package specifier to a static version
 */
function resolvePackageVersion({ name, version }: IPackageSpecifier): string {
  if (!version) {
    version = '*'; // If no version is specified, use the latest version
  }

  if (version.match(/[\*\^\~]/ig)) {
    // If the version contains the characters "*", "^", or "~", we need to figure out what the
    // version resolves to
    try {
      const npmPath: string = getNpmPath();

      // This returns something that looks like:
      //  @microsoft/rush@3.0.0 '3.0.0'
      //  @microsoft/rush@3.0.1 '3.0.1'
      //  ...
      //  @microsoft/rush@3.0.20 '3.0.20'
      //  <blank line>
      const npmViewVersionOutput: string = childProcess.execSync(
        `${npmPath} view ${name}@${version} version --no-update-notifier`,
        { stdio: [] }
      ).toString();
      const versionLines: string[] = npmViewVersionOutput.split('\n').filter((line) => !!line);
      const latestVersion: string = versionLines[versionLines.length - 1];
      const versionMatches: string[] | null = latestVersion.match(/^.+\s\'(.+)\'$/);
      if (!versionMatches) {
        throw new Error(`Invalid npm output ${latestVersion}`);
      }

      return versionMatches[1];
    } catch (e) {
      throw new Error(`Unable to resolve version ${version} of package ${name}: ${e}`);
    }
  } else {
    return version;
  }
}

function run(): void {
  runWithErrorPrinting(() => {
    // tslint:disable-next-line:no-unused-variable
    const [ nodePath, scriptPath, rawPackageSpecifier, packageBinName, ...packageBinArgs ]: string[] = process.argv;

    const packageSpecifier: IPackageSpecifier = parsePackageSpecifier(rawPackageSpecifier);
    const name: string = packageSpecifier.name;
    const version: string = resolvePackageVersion(packageSpecifier);

    if (packageSpecifier.version !== version) {
      console.log(`Resolved to ${name}@${version}`);
    }

    installAndRun(nodePath, name, version, packageBinName, packageBinArgs);
  });
}

run();
