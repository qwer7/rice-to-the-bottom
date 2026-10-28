#!/usr/bin/env python3
"""Build the small TV shell with a JDK, SDK platform and Android build-tools."""
import os, pathlib, secrets, subprocess, zipfile
root=pathlib.Path(__file__).resolve().parents[1]
java=pathlib.Path(os.environ['TV_JAVA_HOME'])/'bin'
tools=pathlib.Path(os.environ['TV_BUILD_TOOLS'])
platform=pathlib.Path(os.environ['TV_ANDROID_JAR'])
output=pathlib.Path(os.environ.get('TV_APK_OUTPUT',str(root/'build/race-to-the-bottom-tv.apk')))
signing=pathlib.Path(os.environ['TV_SIGNING_DIR']); signing.mkdir(parents=True,exist_ok=True)
build=root/'build'; build.mkdir(exist_ok=True)
classes=build/'classes';classes.mkdir(exist_ok=True)
dex=build/'dex';dex.mkdir(exist_ok=True)
env=dict(os.environ)
def run(*args):subprocess.run([str(a) for a in args],check=True,env=env)
run(tools/'aapt2','compile','--dir',root/'app/src/main/res','-o',build/'resources.zip')
run(tools/'aapt2','link','-o',build/'resources.apk','--manifest',root/'app/src/main/AndroidManifest.xml','-I',platform,build/'resources.zip')
run(java/'javac','--release','8','-encoding','UTF-8','-classpath',platform,'-d',classes,*sorted((root/'app/src/main/java').rglob('*.java')))
run(java/'java','-cp',tools/'lib/d8.jar','com.android.tools.r8.D8','--lib',platform,'--min-api','23','--output',dex,*sorted(classes.rglob('*.class')))
with zipfile.ZipFile(build/'resources.apk') as src,zipfile.ZipFile(build/'unsigned.apk','w',zipfile.ZIP_DEFLATED) as target:
 for item in src.infolist():target.writestr(item,src.read(item.filename))
 for item in dex.glob('*.dex'):target.write(item,item.name)
run(tools/'zipalign','-f','4',build/'unsigned.apk',build/'aligned.apk')
password=signing/'password';key=signing/'release.jks'
if not password.exists():password.write_text(secrets.token_urlsafe(32));password.chmod(0o600)
env['TV_SIGN_PASSWORD']=password.read_text()
if not key.exists():
 run(java/'keytool','-genkeypair','-keystore',key,'-alias','race-tv','-keyalg','RSA','-keysize','2048','-validity','10000','-storepass:env','TV_SIGN_PASSWORD','-keypass:env','TV_SIGN_PASSWORD','-dname','CN=Race to the Bottom TV')
 key.chmod(0o600)
output.parent.mkdir(parents=True,exist_ok=True)
run(java/'java','-jar',tools/'lib/apksigner.jar','sign','--ks',key,'--ks-key-alias','race-tv','--ks-pass','env:TV_SIGN_PASSWORD','--key-pass','env:TV_SIGN_PASSWORD','--out',output,build/'aligned.apk')
run(java/'java','-jar',tools/'lib/apksigner.jar','verify','--verbose',output)
run(tools/'aapt2','dump','badging',output)
print('APK:',output)
