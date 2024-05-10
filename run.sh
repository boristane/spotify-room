#!/bin/bash

if [ "$ENV" = "dev" ] ;
then 
  echo "DEV env";
  npm run start
else 
  echo "PROD env";
  npm run build-front;
  npx ts-node -T index.ts;
fi;