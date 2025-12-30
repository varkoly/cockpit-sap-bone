PARTITIONING_DIR="/usr/share/cockpit/cockpit-sap/data/"
PWD_XML_PATH = "/root/pwd.xml"
PWD_XML = """
<?xml version="1.0" encoding="UTF-8"?>
<Passwords>
    <root_password><![CDATA[{0}]]></root_password>
    <sapadm_password><![CDATA[{0}]]></sapadm_password>
    <master_password><![CDATA[{0}]]></master_password>
    <sapadm_password><![CDATA[{0}]]></sapadm_password>
    <password><![CDATA[{0}]]></password>
    <system_user_password><![CDATA[{0}]]></system_user_password>
    <lss_user_password><![CDATA[{0}]]></lss_user_password>
    <lss_backup_password><![CDATA[{0}]]></lss_backup_password>
    <streaming_cluster_manager_password><![CDATA[{0}]]></streaming_cluster_manager_password>
    <ase_user_password><![CDATA[{0}]]></ase_user_password>
    <org_manager_password><![CDATA[{0}]]></org_manager_password>
</Passwords>
"""

INSTALL_HANA = """#!/bin/bash -x
B1=$(find {baseDir}/ -maxdepth 1 -type f -exec grep FOR.B1 {dummy} \;)
if [ -n "$B1" -a ! -d {baseDir}/SAP_HANA_DATABASE ]; then
  # Move the component directories into the first level
  find {baseDir}/DATA_UNITS/  -type d -name "SAP_HANA_*" -exec mv {dummy} {baseDir}/ \;
fi
# Find the installer
HDBLCM=$(find {baseDir}/ -name hdblcm | grep -m 1 -P 'DATABASE|SERVER')
HDBLCMDIR=$(dirname "$HDBLCM")
if [ -z "$HDBLCM" ]; then
  echo "Cannot find hdblcm"
  exit 1
fi
cd "$HDBLCMDIR"
TOIGNORE="check_signature_file"
if [ -e /root/hana-install-ignore ]; then
  TOIGNORE=$(cat /root/hana-install-ignore)
fi
if [ "{xsRouting}" == "ports" ]; then
    cat {pwdXml} | ./hdblcm --batch --action=install \
         --ignore=$TOIGNORE \
         --lss_trust_unsigned_server \
         --components=all \
         --sid={sid} \
         --number={instNumber} \
         --groupid=79 \
         --read_password_from_stdin=xml \
         --xs_routing_mode=ports
else
    cat {pwdXml} | ./hdblcm --batch --action=install \
         --ignore=$TOIGNORE \
         --lss_trust_unsigned_server \
         --components=all \
         --sid={sid} \
         --number={instNumber} \
         --groupid=79 \
         --read_password_from_stdin=xml \
         --xs_routing_mode={xsRouting} \
         --xs_domain_name="{xsDomain}"
fi
exit $?
"""

MAKE_HANA_SHARES = """
mkdir -p /hana/shared
mkdir -p /hana/data/{sid}
mkdir -p /hana/log/{sid}
mkdir -p /usr/sap
"""


B1_PROPERTIES = """B1S_SAMBA_AUTOSTART=true
B1S_SHARED_FOLDER_OVERWRITE=true
BCKP_BACKUP_COMPRESS=true
HANA_DATABASE_USER_ID=SYSTEM
LANDSCAPE_INSTALL_ACTION=create
LICENSE_SERVER_ACTION=register
LICENSE_SERVER_NODE=standalone
SELECTED_FEATURES=B1ServerToolsSLD,B1ServerToolsExtensionManager,B1ServerToolsLicense,B1ServerToolsJobService,B1ServerToolsMobileService,B1ServerToolsXApp,B1SLDAgent,B1WebClient,B1BackupService,B1ServerSHR,B1ServerCommonDB,B1ServerHelp_EN,B1ServerAddons,B1ServerOI,B1AnalyticsOlap,B1AnalyticsTomcatEntSearch,B1AnalyticsTomcatDashboard,B1AnalyticsTomcatReplication,B1AnalyticsTomcatConfiguration,B1AnalyticsTomcatPredictiveAnalysis,B1ServiceLayerComponent,B1ElectronicDocumentService,B1APIGatewayService
SITE_USER_ID=B1SiteUser
SLD_CERTIFICATE_ACTION=self
SLD_DATABASE_ACTION=create
SLD_DATABASE_NAME=SLDDATA
SLD_SERVER_PROTOCOL=https
SLD_SERVER_TYPE=op
INSTALLATION_FOLDER=/usr/sap/SAPBusinessOne
INST_FOLDER_CORRECT_PERMISSIONS=true
SL_LB_MEMBERS=127.0.0.1:50001,127.0.0.1:50002,127.0.0.1:50003,127.0.0.1:50004
SL_LB_MEMBER_ONLY=false
SL_LB_PORT=50000
SL_THREAD_PER_SERVER=24
WEBCLIENT_PORT=8443
#### flexible part ###
BCKP_HANA_SERVERS=<servers><server><system address="{HOSTNAME}"/><database instance="{instNumber}" port="3{instNumber}13" tenant-db="{sid}" user="SYSTEM" password="{adminPw}"/></server></servers>
HANA_DATABASE_ADMIN_ID={lsid}adm
HANA_DATABASE_TENANT_DB={sid}
HANA_DATABASE_INSTANCE={instNumber}
HANA_DATABASE_SERVER_PORT=3{instNumber}13
HANA_DATABASE_SERVER={HOSTNAME}
HANA_DATABASE_LOCATION={HOSTNAME}
HANA_DATABASE_ADMIN_PASSWD={adminPw}
HANA_DATABASE_USER_PASSWORD={adminPw}
LOCAL_ADDRESS={HOSTNAME}
SITE_USER_PASSWORD={adminPw}
"""

INSTALL_B1 = """mkdir -p /usr/sap/SAPBusinessOne/
mkdir -p /var/log/SAPBusinessOne/
chmod +x {baseDir}/Packages.Linux/ServerComponents/install
{baseDir}/Packages.Linux/ServerComponents/install -i silent -f {baseDir}/b1h_properties
"""
