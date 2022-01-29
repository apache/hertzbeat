#!/bin/bash

cd ../../web-app

ng build --prod --base-href /console/

cd ..

mvn clean package
