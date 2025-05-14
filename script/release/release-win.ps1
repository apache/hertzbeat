# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

$gpgKeyId = "********"

# ********************************************************
# Set version and release candidate number
$version = "1.7.1"
$rcNumber = "rc1"
# ********************************************************

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = (Get-Item (Split-Path -Parent $scriptPath)).Parent.FullName

$distPath = "$projectPath\dist"

# Clean up the 'dist' directory
Write-Host "Cleaning up the 'dist' directory..."
Remove-Item -Recurse -Force $distPath\* -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $distPath -Force

# Clean up the 'web-app/dist' directory
Write-Host "Cleaning up the 'web-app/dist' directory..."
$webAppDistPath = "$projectPath\web-app\dist"
Remove-Item -Recurse -Force $webAppDistPath\* -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $webAppDistPath -Force
Push-Location -Path $projectPath

Write-Host "Installing dependencies and packaging web-app..."
Push-Location -Path "web-app"
yarn install
yarn package
Pop-Location

Write-Host "Building project with Maven..."
mvn clean package -Prelease -DskipTests

mvn clean install -DskipTests

Write-Host "Building collector..."
Push-Location -Path "collector"
mvn clean package -Pcluster -DskipTests
Pop-Location

# package release artifacts
Write-Host "Archiving source code..."
git archive --format=tar.gz --output="dist/apache-hertzbeat-$version-incubating-src.tar.gz" --prefix=apache-hertzbeat-$version-incubating-src/ release-$version-$rcNumber

# sign release artifacts
Write-Host "Signing release artifacts..."
Push-Location -Path "dist"
Get-ChildItem *.tar.gz | ForEach-Object {
    $fileName = $_.Name
    Write-Host "Signing $fileName..."
    gpg -u $gpgKeyId --armor --output "$fileName.asc" --detach-sig "$fileName"
    Write-Host "Generating SHA512 for $fileName..."
    $hash = Get-FileHash -Path "$fileName" -Algorithm SHA512
    $hashString = $hash.Hash
    "$hashString  $fileName" | Out-File "$fileName.sha512" -Append -NoNewline
}
Pop-Location

# verify signatures
Write-Host "Verifying signatures..."
Push-Location -Path "dist"
Get-ChildItem *.tar.gz | ForEach-Object {
    $fileName = $_.Name
    Write-Host "Verifying $fileName..."
    gpg --verify "$fileName.asc" "$fileName"
    Write-Host "Checking SHA512 for $fileName..."
    $hash = Get-FileHash -Path "$fileName" -Algorithm SHA512
    if ($hash.Hash -eq $null) {
        Write-Host "Hash mismatch for $fileName"
    } else {
        Write-Host "Hash verified for $fileName"
    }
}
Pop-Location
