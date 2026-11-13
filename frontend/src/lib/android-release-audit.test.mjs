import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')
const manifest=read('../../android/app/src/main/AndroidManifest.xml')
const release=read('../../android/app/src/release/AndroidManifest.xml')
const networkBeta=read('../../android/app/src/main/res/xml/network_security_config.xml')
const networkRelease=read('../../android/app/src/release/res/xml/network_security_config.xml')
const java=read('../../android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java')
const updater=read('./update.js')
const health=read('./health-sync.js')

test('release refuses cleartext, user CAs, mixed HTTP WebView content and cloud auto backup',()=>{
 assert.match(networkRelease,/cleartextTrafficPermitted="false"/)
 assert.match(networkRelease,/src="system"/)
 assert.doesNotMatch(networkRelease,/src="user"/)
 assert.match(release,/allowBackup="false"/)
 assert.match(release,/usesCleartextTraffic="false"/)
 assert.match(java,/FLAG_DEBUGGABLE/)
 assert.match(java,/MIXED_CONTENT_NEVER_ALLOW/)
})
test('debug compatibility and application identity remain intact for existing testers',()=>{
 assert.match(networkBeta,/cleartextTrafficPermitted="true"/)
 assert.match(networkBeta,/src="user"/)
 assert.match(manifest,/allowBackup="true"/)
 assert.match(read('../../android/app/build.gradle'),/applicationIdSuffix "\.test"/)
})
test('the updater can never point back to original openGym releases',()=>{
 assert.match(updater,/Azerusxx\/openForm/)
 assert.doesNotMatch(updater,/DuarteSantos8\/openGym/)
 assert.match(updater,/\.sha256/)
})
test('requested Health Connect rights are used only when user enables syncing',()=>{
 assert.match(manifest,/WRITE_EXERCISE/)
 assert.match(manifest,/WRITE_WEIGHT/)
 assert.match(health,/export async function enableHealth/)
 assert.match(health,/requestPermissions\(\)/)
 assert.match(health,/p\.HC\.write/)
})
