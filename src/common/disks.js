//@ts-nocheck
import cockpit from 'cockpit';
const _ = cockpit.gettext;
const disks = {
    inited: false
}

function findFreeSlots(){
    disks.freeSlots = [{
        name: "",
        label: _("Select a device for the SAP Installation."),
        isPlaceholder: true
    }]
    for( let dev of disks.disks) {
        if(dev.type != 'disk') continue;
        if(!("children" in dev)) {
            disks.freeSlots.push(
                {
                    name: '/dev/' + dev.name,
                    size: dev.size,
                    label: dev.name + " " + parseInt(dev.size/1073741824) + "GB",
                    isPlaceholder: false
                }
            )
            continue;
        }
        let summ = 0;
        for(let part of dev.children){
            summ = summ + part.size
        }
        if( dev.size - summ > 1073741824) {
            disks.freeSlots.push(
                {
                    name: '/dev/' + dev.name,
                    size: dev.size - summ,
                    label: dev.name + " " + parseInt((dev.size - summ)/1073741824) + "GB",
                    isPlaceholder: false
                }
            )
        }
    }
}
disks.init = (callback) => {
    console.log("disk.init called")
    cockpit.spawn(['lsblk','-Jb']).then(
        (value) => {
            disks.disks = JSON.parse(value)["blockdevices"]
            disks.inited = true;
            findFreeSlots()
            callback()
        }
    ).catch(
        (error) => {
            console.log(error)
            callback()
        }
    )
}

export default disks;