// @ts-nocheck
import { useContext } from 'react';
import cocpit from 'cockpit';
const _ = cocpit.gettext;

const reserved_sids = "ADD ALL AND ANY ASC COM DBA END EPS FOR GID IBM INT KEY LOG MON NIX NOT OFF OMS RAW ROW SAP SET SGA SHG SID SQL SYS TMP UID USR VAR"
const starts_with_digit = /^\d/
const valid_inst_number = /^\d\d$/
const contains_spec_chars = /[\!\@\#\$\%\^\&\*\(\)\_\+]/
const starts_with_bad = /^[!?]/


export function readSapInstallations() {
    let tmp = []
    cockpit.file("/usr/sap/sapservices", { superuser: "require" }).read().then((content, tag) => {
        if (content != null) {
            for (var line of content.split("\n")) {
                var fields = line.split(" ");
                if (fields.length > 3) {
                    tmp.push({ sid: fields[3].slice(3, 6), instNumber: fields[3].slice(7, 9) })
                }
            }
        }
    }).catch(error => {
        console.log(error)
    })
    return tmp
}

export function isValidIP(IP) {

    if (!IP)
        return false;

    // Regex expression for validating IPv4
    let ipv4 = /(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(\/\d+)*/;

    // Regex expression for validating IPv6
    let ipv6 = /((([0-9a-fA-F]){1,4})\:){7}([0-9a-fA-F]){1,4}(\/\d+)*/;

    // Checking if it is a valid IPv4 addresses
    if (IP.match(ipv4))
        return true;

    // Checking if it is a valid IPv6 addresses
    else if (IP.match(ipv6))
        return true;

    // Return Invalid
    return false;
}

export function isValidDns(DNSName) {
    let regex1 = new RegExp(/^(?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$/g);
    if (regex1.test(DNSName)) {
        return true
    }
    let regex2 = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
    return regex2.test(DNSName)
}


export function checkSid(value, setSidValidated, setSidHelperText, sapData) {
    if (value.length != 3) {
        setSidValidated('error')
        setSidHelperText(_("The SID needs to be exactly 3 chars."))
        return
    }
    if (reserved_sids.split(" ").indexOf(value.toUpperCase()) != -1) {
        setSidValidated('error')
        setSidHelperText(_("The SID is reserved and cannot be used."))
        return
    }
    if (value.match(starts_with_digit)) {
        setSidValidated('error')
        setSidHelperText(_("The SID needs to start with a letter."))
        return
    }
    if (sapData.installations.filter((inst, rowIndex) => { return inst.sid == value }).length > 0) {
        setSidValidated('error')
        setSidHelperText(_("The SID is already used."))
        return
    }
    setSidHelperText('')
    setSidValidated('success')
}

export function checkInstNumber(value, setInstNumberValidated, setInstNumberHelperText) {
    if (!value.match(valid_inst_number)) {
        setInstNumberValidated('error')
        setInstNumberHelperText(_("The SAP HANA Instance Number needs to be exactly 2 digits long."))
        return
    }
    setInstNumberHelperText('')
    setInstNumberValidated('success')
}

export function checkPassword(value, setPasswordValidated, setPasswordHelperText) {
    if (value.length < 8) {
        setPasswordValidated('error')
        setPasswordHelperText(_('Password needs consist of 8 or more characters.'))
        return
    }
    if (value.match(starts_with_bad)) {
        setPasswordValidated('error')
        setPasswordHelperText(_("Password must not starts with '!' or '?'."))
        return
    }
    if (!value.match(contains_spec_chars)) {
        setPasswordValidated('error')
        setPasswordHelperText(_("Password must contain at least one special character:'! @ # $ % ^ & * () _ +'."))
        return
    }
    if (!value.match(/[A-Z]/)) {
        setPasswordValidated('error')
        setPasswordHelperText(_("Password must contain at least one upper case character."))
        return
    }
    if (!value.match(/[a-z]/)) {
        setPasswordValidated('error')
        setPasswordHelperText(_("Password must contain at least one lower case character."))
        return
    }
    if (!value.match(/[0-1]/)) {
        setPasswordValidated('error')
        setPasswordHelperText(_("Password must contain at least one digit character."))
        return
    }
    setPasswordValidated('success')
    setPasswordHelperText('')
}