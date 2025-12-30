// @ts-nocheck
import React, { useContext } from 'react';
import {
    ActionGroup,
    Alert,
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardBody,
    Divider,
    ExpandableSection,
    Form,
    FormGroup,
    FormHelperText,
    FormSelect,
    FormSelectOption,
    FormSection,
    Grid,
    GridItem,
    HelperText,
    HelperTextItem,
    Panel,
    PanelHeader,
    PanelMain,
    PanelMainBody,
    Popover,
    TextInput,
    ValidatedOptions
} from "@patternfly/react-core"
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import HelpIcon from '@patternfly/react-icons/dist/esm/icons/help-icon';
import styles from '@patternfly/react-styles/css/components/Form/form';
import cockpit from 'cockpit';
import { SapDataContext } from '../contexts/SapDataContext';
import disks from '../common/disks';
import { checkSid, checkInstNumber, checkPassword } from '../common/common';
const _ = cockpit.gettext;
const sapints_bin = '/usr/share/cockpit/cockpit-sap/bin/sap_install.py'
/**
 * @type {cockpit.FileWatchHandle | null}
 */
var watch_handle = null

const firewalld = cockpit.dbus('org.fedoraproject.FirewallD1', { superuser: "try" });
firewalld.call("/org/fedoraproject/FirewallD1", "org.fedoraproject.FirewallD1.zone", "getActiveZones")
    .then((info) => { console.log(info) })
    .catch((err) => { console.log(err) })

export const Installation = (props) => {

    const { sapData, updateNestedSapData } = useContext(SapDataContext);
    const [instLog, setInstLog] = React.useState('')
    console.log(sapData)

    /** Handling of SID */
    const [sidValidated, setSidValidated] = React.useState(ValidatedOptions.default);
    const [sidHelperText, setSidHelperText] = React.useState('');
    const handleSidChange = (_event, value) => {
        updateNestedSapData('installation.sid', value.toUpperCase());
        checkSid(value, setSidValidated, setSidHelperText, sapData)
    };

    const [, updateState] = React.useReducer(x => x + 1, 0);
    const forceUpdate = () => {
        updateState();
    };


    /** Handling of instant number */
    const [instNumberValidated, setInstNumberValidated] = React.useState(ValidatedOptions.default);
    const [instNumberHelperText, setInstNumberHelperText] = React.useState('');
    const handleInstNumberChange = (_even, value) => {
        updateNestedSapData('installation.instNumber', value);
        checkInstNumber(value, setInstNumberValidated, setInstNumberHelperText)
    }

    /*
    * variable handling for admin password
    */
    const [adminPw1, setAdminPw1] = React.useState("");
    const [passwordValidated, setPasswordValidated] = React.useState(ValidatedOptions.default);
    const [passwordHelperText, setPasswordHelperText] = React.useState('');
    const [adminPw2, setAdminPw2] = React.useState("");
    const [password2Validated, setPassword2Validated] = React.useState(ValidatedOptions.default);
    const [password2HelperText, setPassword2HelperText] = React.useState('');
    const handleAdminPwChange1 = (_even, value) => {
        setAdminPw1(value)
        updateNestedSapData('installation.adminPw', value);
        if (value != adminPw2) {
            setPassword2Validated('warning')
            setPassword2HelperText(_('Passwords differ.'))
        }
        checkPassword(value, setPasswordValidated, setPasswordHelperText)
    }
    const handleAdminPwChange2 = (_even, value) => {
        setAdminPw2(value)
        if (value != adminPw1) {
            setPassword2Validated('warning')
            setPassword2HelperText(_('Passwords differ.'))
            return
        }
        setPassword2Validated('success')
        setPassword2HelperText('')
    }

    /*
    * variable handling for XS routing
    */
    const [xsRoutingValidated, setXsRoutingValidated] = React.useState(ValidatedOptions.default)
    const handleXsRouting = (_event, value) => {
        updateNestedSapData('installation.xsRouting', value)
        if (value == 'ports') {
            updateNestedSapData('installation.xsDomain', '')
            setXsRoutingValidated('success')
        } else {
            setXsRoutingValidated('warning')
        }
    }
    const handleXsDomain = (_event, value) => {
        updateNestedSapData('installation.xsDomain', value)
        setXsRoutingValidated('success')
    }
    const options = [
        { value: '', label: _('Select the HANA XS routing mode'), disabled: true, isPlaceholder: true },
        { value: 'ports', label: 'ports', disabled: false, isPlaceholder: false },
        { value: 'hostname', label: 'hostname', disabled: false, isPlaceholder: false }
    ];

    /*
    * Variable handling for the installtions media for HANA and SAP product(s)
    */
    const [hanaUrlValidated, setHanaUrlValidated] = React.useState(ValidatedOptions.default)
    const [productUrlValidated, setProductUrlValidated] = React.useState(ValidatedOptions.default)
    const [hanaUrlPathPlaceholder, setHanaUrlPathPlaceholder] = React.useState('');
    const [productUrlPathPlaceholder, setProductUrlPathPlaceholder] = React.useState('');
    const handleHanaUrlProtocol = (_event, value) => {
        switch (value) {
            case 'file:///': setHanaUrlPathPlaceholder("/dir1/dir2/"); break;
            case 'nfs://': setHanaUrlPathPlaceholder("nfs.server/path"); break;
            case 'smb://': setHanaUrlPathPlaceholder("[[domain;]username[:password]@]samba.server/share/path"); break;
        }
        updateNestedSapData('installation.hanaUrlProtocol', value)
        if (sapData.installation.hanaUrlPath.length > 3 && sapData.installation.hanaUrlPath.includes('/')) {
            setHanaUrlValidated('success')
        } else {
            setHanaUrlValidated('error')
        }
    }
    const handleHanaUrlPath = (_event, value) => {
        updateNestedSapData('installation.hanaUrlPath', value)
        if (value.length > 3 && value.includes('/') && sapData.installation.hanaUrlProtocol.includes('//')) {
            setHanaUrlValidated('success')
        } else {
            setHanaUrlValidated('error')
        }
    }
    const handleProductUrlProtocol = (_event, value) => {
        switch (value) {
            case 'file:///': setProductUrlPathPlaceholder("/dir1/dir2/"); break;
            case 'nfs://': setProductUrlPathPlaceholder("nfs.server/path"); break;
            case 'smb://': setProductUrlPathPlaceholder("[[domain;]username[:password]@]samba.server/share/path"); break;
        }
        updateNestedSapData('installation.productUrlProtocol', value)
        if (sapData.installation.productUrlPath.length > 3 && sapData.installation.productUrlPath.includes('/')) {
            setProductUrlValidated('success')
        } else {
            setProductUrlValidated('error')
        }
    }
    const handleProductUrlPath = (_event, value) => {
        updateNestedSapData('installation.productUrlPath', value)
        if (value.length > 3 && value.includes('/') && sapData.installation.productUrlProtocol.includes('//')) {
            setProductUrlValidated('success')
        } else {
            setProductUrlValidated('error')
        }
    }
    const urlProtocols = [
        { value: '', label: _('Select the URL protocol.'), disabled: true, isPlaceholder: true },
        { value: 'file://', label: _('Local Directory'), disabled: false, isPlaceholder: true },
        { value: 'nfs://', label: _('NFS Share'), disabled: false, isPlaceholder: true },
        { value: 'smb://', label: _('Samba Share'), disabled: false, isPlaceholder: true },
    ]

    const handleSelectedDevice = (_even, value) => {
        updateNestedSapData('installation.device', value)
    }

    const handleHosts = (_even, value) => {
        updateNestedSapData('installation.hosts', value)
    }

    const [isSapExpanded, setIsSapExpanded] = React.useState(false);
    const onSapToggle = (_event, isExpanded) => {
        setIsSapExpanded(isExpanded)
    };
    const [isInstExpanded, setIsInstExpanded] = React.useState(false);
    const onInstToggle = (_event, isExpanded) => {
        setIsInstExpanded(isExpanded)
    };

    const downloadLog = () => {
        const element = document.createElement("a")
        const file = new Blob([instLog], { type: 'text/plain' })
        element.href = URL.createObjectURL(file);
        element.download = "sapinstall-log.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    }

    const cleanUp = () => {
        updateNestedSapData('processes.installation', null)
        watch_handle.remove();
        cockpit.spawn(["rm", "-f", sapData.installation.logFile], { superuser: "require" })
        updateNestedSapData('installation.logFile', "")
        setInstLog('')
    }

    const startInstallation = () => {
        cockpit.spawn(['mktemp', '/run/sapinst-XXXXXXXXXX.log'], { superuser: "require", err: "message" }).then(
            (value) => {
                watch_handle = cockpit.file(value.trim(), { superuser: "require" }).watch((content) => {
                    setInstLog(content)
                })
                updateNestedSapData('installation.logFile', value.trim())
                let tmp = cockpit.spawn([sapints_bin, '&>', sapData.installation.logFile], { superuser: "require", err: "message" })
                updateNestedSapData('processes.installation', tmp)
                sapData.processes.installation.input(JSON.stringify(sapData.installation))
                sapData.processes.installation.then((value) => {
                    updateNestedSapData('installation.result', value)
                }).catch((error) => {
                    updateNestedSapData('installation.result', error.message)
                })
            }
        ).catch((error) => {
            console.log(error)
            updateNestedSapData('installation.result', error.message)
        })
    }
    const InstallationActions = (
        <>
            <Button onClick={cleanUp} variant="danger">{_("Clen Up")}</Button>
            <Button onClick={downloadLog}>{_("Download Log File")}</Button>
        </>
    )

    /*
    * Show the actual running installation
    */
    const ShowInstallation = () => {
        return (
            <Panel isScrollable variant="raised">
                <PanelHeader>{_("Log of the installation")}</PanelHeader>
                <Divider />
                <PanelMain>
                    <PanelMainBody>
                        <pre>{instLog}</pre>
                    </PanelMainBody>
                </PanelMain>
            </Panel>
        )
    }


    /*
    * Show the result of the SAP installation
    */
    const ShowResult = () => {
        return (
            <Card>
                <CardHeader actions={{ actions: InstallationActions }}>
                    <CardTitle>{_("Result of the Installation")}</CardTitle>
                </CardHeader>
                <CardBody>{sapData.installation.result}</CardBody>
            </Card>
        )
    }

    const SelectHardDisk = () => {
        return (
            <FormGroup
                label={_("Harddisk")}
                labelHelp={
                    <Popover
                        headerContent={<div>{_("Select the Harddisk where SAP componenets will be installed.")}</div>}
                        bodyContent={<div>{_("The components of SAP products will be installed in different directories on the filesystem:")}<br />
                            <pre>/hana/data /hana/log/
                                /hana/shared /usr/sap ..</pre>
                            {_("If you select a free device a LVM containing this directories will be created on it with appropriate size.")}<br />
                            {_("If your hardware partner provides a predefined partitioning this will be applied automaticaly.")}<br />
                            {_("If your do not select any device the SAP components will be installed on the root filesystem.")}
                        </div>}>
                        <Button variant='link' aria-label="More info for harddisk field" onClick={e => e.preventDefault()} className={styles.formGroupLabelHelp}>
                            <HelpIcon />
                        </Button>
                    </Popover>
                }>
                {
                    (disks.freeSlots.length > 1) ?
                        <FormSelect value={sapData.installation.selectedDevice} onChange={handleSelectedDevice} id="sap-inst-device">
                            {disks.freeSlots.map((option, index) => <FormSelectOption key={index} value={option.name} label={option.label} isPlaceholder={option.isPlaceholder} />)}
                        </FormSelect>
                        :
                        <Alert isExpandable variant="warning" title={_('No usable hard disk found.')}>
                            <p>{_("The installation can be started. The SAP products will be in into the root filesystem.")}</p>
                        </Alert>
                }
            </FormGroup>
        )
    }

    const SetHosts = () => {
        if (props.os.NAME == "SLES") {
            //updateNestedSapData('installation.hosts','localhost')
            return ""
        } else {
            return (
                <FormGroup
                    label={_("Servers on which the SAP components must be installed")}
                    labelHelp={
                        <Popover
                            headerContent={<div>{_("Servers on which the SAP components must be installed")}</div>}
                            bodyContent={<div>{_("Provide a space separated lists of hosts on which the SAP Components need to be installed.")}<br />
                                {_("You have to provide at least one host. You can provide dns names or ip adresses.")}<br />
                                {_("The servers must be accessible as 'root' via ssh, preferably without a password.")}<br />
                            </div>}>
                            <Button variant='link' aria-label="More info for hosts field" onClick={e => e.preventDefault()} aria-describedby="simple-form-name-01" className={styles.formGroupLabelHelp}>
                                <HelpIcon />
                            </Button>
                        </Popover>
                    }>
                    <TextInput isRequired={true} type="text" id="sap-hosts" value={sapData.installation.hosts} onChange={handleHosts}></TextInput>
                </FormGroup>
            )
        }
    }

    const InstallationsMask = () => {
        return (
            <Form>
                <Grid hasGutter md={6}>
                    <GridItem span="6">
                        <FormGroup label={_("SID (SAP HANA System ID)")}>
                            <TextInput isRequired validated={sidValidated} type="text" id="sap-sid" value={sapData.installation.sid} onChange={handleSidChange}></TextInput>
                            <FormHelperText>
                                <HelperText>
                                    <HelperTextItem variant={sidValidated} {...(sidValidated === 'error' && { icon: <ExclamationCircleIcon /> })}>
                                        {sidHelperText}
                                    </HelperTextItem>
                                </HelperText>
                            </FormHelperText>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={6}>
                        <FormGroup label={_("SAP HANA Instance Number")}>
                            <TextInput isRequired validated={instNumberValidated} type="text" id="sap-inst-number" value={sapData.installation.instNumber} onChange={handleInstNumberChange}></TextInput>
                            <FormHelperText>
                                <HelperText>
                                    <HelperTextItem variant={instNumberValidated} {...(instNumberValidated === 'error' && { icon: <ExclamationCircleIcon /> })}>
                                        {instNumberHelperText}
                                    </HelperTextItem>
                                </HelperText>
                            </FormHelperText>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={6}>
                        <FormGroup label={_("SAP HANA Master Password")} role='group'>
                            <TextInput isRequired validated={passwordValidated} type="password" id="sap-master-password1" value={adminPw1} onChange={handleAdminPwChange1}></TextInput>
                            <FormHelperText>
                                <HelperText>
                                    <HelperTextItem variant={passwordValidated} {...(passwordValidated === 'error' && { icon: <ExclamationCircleIcon /> })}>
                                        {passwordHelperText}
                                    </HelperTextItem>
                                </HelperText>
                            </FormHelperText>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={6}>
                        <FormGroup label={_("Repeat SAP HANA Master Password")} role='group'>
                            <TextInput isRequired validated={password2Validated} type="password" id="sap-master-password2" value={adminPw2} onChange={handleAdminPwChange2}></TextInput>
                            <FormHelperText>
                                <HelperText>
                                    <HelperTextItem variant={password2Validated} {...(password2Validated === 'error' && { icon: <ExclamationCircleIcon /> })}>
                                        {password2HelperText}
                                    </HelperTextItem>
                                </HelperText>
                            </FormHelperText>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={12}>
                        <FormSection title={_("SAP HANA XS Routing")} />
                    </GridItem>
                    <GridItem span={3}>
                        <FormGroup label={_("Routing Mode")}>
                            <FormSelect isRequired validated={xsRoutingValidated} value={sapData.installation.xsRouting} onChange={handleXsRouting} id="sap-xs-routing">
                                {options.map((option, index) => <FormSelectOption isDisabled={option.disabled} key={index} value={option.value} label={option.label} />)}
                            </FormSelect>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={9}>
                        <FormGroup label={_("XS Domain Name")}>
                            <TextInput isRequired={sapData.xsRouting == "domain"} validated={xsRoutingValidated} isDisabled={sapData.xsRouting == "ports"} type="text" id="sap-xs-domain" value={sapData.xsDomain} onChange={handleXsDomain}></TextInput>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={12}>
                        <FormSection title={_("URL to SAP HANA Database Installation Media")} />
                    </GridItem>
                    <GridItem span={3}>
                        <FormGroup label={_("Protocol")} role="group">
                            <FormSelect isRequired validated={hanaUrlValidated} value={sapData.installation.hanaUrlProtocol} onChange={handleHanaUrlProtocol} id="sap-hana-url-protocol">
                                {urlProtocols.map((option, index) => <FormSelectOption isDisabled={option.disabled} key={index} value={option.value} label={option.label} />)}
                            </FormSelect>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={9}>
                        <FormGroup label={_("Path")}>
                            <TextInput isRequired validated={hanaUrlValidated} type="text" id="sap-hana-url-path" value={sapData.installation.hanaUrlPath} onChange={handleHanaUrlPath} placeholder={hanaUrlPathPlaceholder}></TextInput>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={12}>
                        <FormSection title={<div>
                            {_("URL to SAP Product Installation Media")} <Popover
                                headerContent={<div>{_("URL to SAP Product Installation Media")}</div>}
                                bodyContent={<div>Actual supported SAP products are <b>Business One</b> and <b>S/4</b>.<br />You do not need to provide SAP product installation media. In this case only the HANA database will be installed.
                                </div>}>
                                <Button variant='link' aria-label="More info for SAP Product Installation Media." onClick={e => e.preventDefault()} className={styles.formGroupLabelHelp}>
                                    <HelpIcon />
                                </Button>
                            </Popover>
                        </div>} />
                    </GridItem>
                    <GridItem span={3}>
                        <FormGroup label={_("Protocol")} role="group">
                            <FormSelect validated={productUrlValidated} value={sapData.installation.productUrlProtocol} onChange={handleProductUrlProtocol} id="sap-url-protocol">
                                {urlProtocols.map((option, index) => <FormSelectOption isDisabled={option.disabled} key={index} value={option.value} label={option.label} />)}
                            </FormSelect>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={9}>
                        <FormGroup label={_("Path")}>
                            <TextInput validated={productUrlValidated}  type="text" id="sap-url-path" value={sapData.installation.productUrlPath} onChange={handleProductUrlPath} placeholder={productUrlPathPlaceholder}></TextInput>
                        </FormGroup>
                    </GridItem>
                    <GridItem span={6}>
                        <SelectHardDisk />
                    </GridItem>
                    <GridItem span={6}>
                        <SetHosts />
                    </GridItem>
                    <ActionGroup>
                        <Button onClick={startInstallation} variant="primary"
                            isDisabled={
                                sidValidated != 'success' || instNumberValidated != 'success' || passwordValidated != 'success' || password2Validated != 'success' || xsRoutingValidated != 'success' || hanaUrlValidated != 'success'
                            }
                        >{_("Start Installation")}</Button>
                    </ActionGroup>
                </Grid>
            </Form>
        )
    }
    //Let's show what we have
    return (
        <>
            {(sapData.installation.result.length > 0) && ShowResult()}
            {(instLog.length > 0) && ShowInstallation()}
            {(sapData.installation.result.length == 0 && instLog.length == 0) && InstallationsMask()}
        </>
    )
}

