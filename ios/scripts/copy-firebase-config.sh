#!/bin/sh

set -eu


firebase_plist="${PROJECT_DIR}/ExCloth/GoogleService-Info.plist"
push_enabled="${IOS_PUSH_NOTIFICATIONS_ENABLED:-}"
generated_env_header="${BUILD_DIR}/GeneratedInfoPlistDotEnv.h"


if [ -z "${push_enabled}" ] && [ -f "${generated_env_header}" ]; then
  push_enabled=$(
    awk '
      $1 == "#define" && $2 == "IOS_PUSH_NOTIFICATIONS_ENABLED" {
        print $3
        exit
      }
    ' "${generated_env_header}"
  )
fi


push_enabled=$(
  printf '%s' "${push_enabled:-false}" |
    tr '[:upper:]' '[:lower:]' |
    tr -d "\"'"
)


if [ ! -f "${firebase_plist}" ]; then
  if [ "${push_enabled}" = "true" ]; then
    echo "error: IOS_PUSH_NOTIFICATIONS_ENABLED=true requires ExCloth/GoogleService-Info.plist" >&2
    exit 1
  fi

  exit 0
fi


firebase_bundle_id=$(
  /usr/libexec/PlistBuddy \
    -c 'Print:BUNDLE_ID' \
    "${firebase_plist}" \
    2>/dev/null ||
    true
)


if [ "${firebase_bundle_id}" != "${PRODUCT_BUNDLE_IDENTIFIER}" ]; then
  echo "error: GoogleService-Info.plist BUNDLE_ID does not match ${PRODUCT_BUNDLE_IDENTIFIER}" >&2
  exit 1
fi


resources_directory="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}"

/usr/bin/install \
  -d \
  "${resources_directory}"

/usr/bin/install \
  -m 0644 \
  "${firebase_plist}" \
  "${resources_directory}/GoogleService-Info.plist"
