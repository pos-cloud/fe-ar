#!/bin/bash

function error_exit {
  echo "$1" >&2
  exit 1
}

read adHocName
PROJECT_NAME="afip-integration"
nest new $PROJECT_NAME --skip-git || error_exit "Failed to create NestJS project."

cd $PROJECT_NAME || error_exit "Failed to navigate into project directory."

npm install --save soap || error_exit "Failed to install SOAP package."


# Create the model directory and file
mkdir -p src/models || error_exit "Failed to create models directory."
mkdir -p src/afip || error_exit "Failed to create models directory."

cd src/afip

nest g s wsaa
nest g s wsfev1