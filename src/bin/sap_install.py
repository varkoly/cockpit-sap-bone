#!/usr/bin/python3
import json
import multiprocessing
import os
import socket
import sys
import re
from urllib.parse import urlparse
from subprocess import PIPE, Popen, run, STDOUT
from sap_install_const import B1_PROPERTIES, INSTALL_HANA, MAKE_HANA_SHARES, PARTITIONING_DIR, PWD_XML, PWD_XML_PATH


# Global variables
base_dir = ""
params = {}
hosts = []

def find_largest_free_slot(whole_only = True):
    '''
    Searches the largest free disk slot on the drives

    Args:
    If whole_onyl is true only disks with no existing partitions will be concidered.

    Returns:
    hash: Containing followig keys:
       name: Name of the device
       size: The size of the device
       free: The free space of the device
    '''
    free_slot = {
        'name': '',
        'free': 0
    }
    for disk in json.loads(os.popen('lsblk -Jb').read())['blockdevices']:
        if disk['type'] != 'disk': continue
        if not 'children' in disk:
            if disk['size'] > free_slot['free']:
                free_slot = disk
                free_slot['free'] = disk['size']
        elif whole_only: continue
        else:
            summ = 0
            for part in disk['children']:
                summ = summ + part['size']
            if (disk['size'] - summ) > free_slot['free']:
                free_slot = {'name': disk['name'], 'free': disk['size'] - summ, 'size':disk['size'] }
        free_slot['name'] = f"/dev/{free_slot['name']}"
    return free_slot

def get_vg_size(devices: list) -> int:
    '''
    Calculates the overall size of a volume group. Resulting from the physical device sizes
    Args:
    List of the devices of the LVG

    Retruns:
    int: The max size of the LVG
    '''
    size = 0
    for device in devices:
        disk = json.loads(os.popen("lsblk -Jb {0}".format(device)).read())
        size = size + int(disk['blockdevices'][0]['size'])
    return size

def read_physical_memory():
    """
    Reads the physical memory size from /proc/meminfo

    Args:
    There is no argument

    Returns:
    int: The size in bytes
    """
    meminfo = {}
    with open('/proc/meminfo', 'r') as file:
        for line in file:
            parts = line.split()
            key = parts[0].rstrip(':')
            value = int(parts[1])  # The value is in kB
            meminfo[key] = value

    total_memory = meminfo.get('MemTotal', 0) * 1024  # Convert to B
    # free_memory = meminfo.get('MemFree', 0) * 1024  # Convert to B
    # available_memory = meminfo.get('MemAvailable', 0) * 1024  # Convert to B
    return total_memory #, free_memory, available_memory

def parse_disk_size(size_str: str, device_size: int) -> int:
    """
    Parse a disk size string with units and convert it to bytes.

    Args:
    size_str (str): The disk size string, e.g., '10GB', '500MB', '1TB'
    device_size (int): The size of the corresponding physical device

    Returns:
    int: The size in bytes
    """
    size_str = size_str.strip().upper()
    total_memory = read_physical_memory()

    # Define unit multipliers
    unit_multipliers = {
        'B': 1,
        'K': 1000,
        'KB': 100,
        'KiB': 1024,
        'M': 1000 ** 2,
        'MB': 1000 ** 2,
        'MiB': 1024 ** 2,
        'G': 1000 ** 3,
        'GB': 1000 ** 3,
        'GiB': 1024 ** 3,
        'T': 1000 ** 4,
        'TB': 1000 ** 4,
        'TiB': 1024 ** 4,
        'P': 1000 ** 5,
        'PB': 1000 ** 5,
        'PiB': 1024 ** 5,
        'RAM':  total_memory,
        '%': device_size/100
    }

    # Find the position of the first non-digit character
    pos = 0
    while pos < len(size_str) and (size_str[pos].isdigit() or size_str[pos] == '.'):
        pos += 1

    # Split the number and the unit
    number_str = size_str[:pos]
    unit_str = size_str[pos:]

    # Get the multiplier for the unit
    unit_multiplier = unit_multipliers.get(unit_str, None)

    if unit_multiplier is None:
        #raise ValueError(f"Unknown unit: {unit_str}")
        return 0

    # Convert number part to float
    number = float(number_str)

    # Calculate the size in bytes
    size_in_bytes = int(number * unit_multiplier)

    return size_in_bytes

def find_hana_partitioning():
    """
    Searches the hana partitioning template for the hardware. These are in the PARTITIONING_DIR with following names:
    hana_partitioning_<Manufacturer>_<Product>.json or hana_partitioning_<Manufacturer>.json
    If no such file will be found the default hana_partitioning.json will be use.

    Args:
    No arguments

    Returns:
    str: The path to the partitionig template file
    """
    manufacturer = ""
    product = ""
    sysinfo = False
    for line in os.popen('hwinfo --bios').readlines():
        if sysinfo:
            match = re.search(r'Product: "(.*)"', line)
            if match:
                product = match.group(1)
            match = re.search(r'Manufacturer: "(.*)"', line)
            if match:
                manufacturer = match.group(1)
            if manufacturer != "" and product != "":
                break
        match = re.search(r'System Info', line)
        if match:
            sysinfo = True
    part_path = os.path.join(PARTITIONING_DIR, 'hana_partitioning_', manufacturer,  '_', product, '.json')
    if not os.path.exists(part_path):
        part_path = os.path.join(PARTITIONING_DIR, 'hana_partitioning_', manufacturer, '.json')
    if not os.path.exists(part_path):
        part_path = os.path.join(PARTITIONING_DIR, 'hana_partitioning.json')
    return part_path

def run_command(command):
    '''
    Runs a command and prints the stderr and stdout to stdout

    Args:
    str: The programm and arguments presented by a string.
    '''
    print(f"Running command: {command}")
    try:
        lcommand = command.split()
        result = run(lcommand, check=True, stdout=PIPE, stderr=PIPE)
        print(result.stdout.decode())
        if result.stderr:
            print(result.stderr.decode())
    except Exception as e:
        print(e)
        print(f"An error accoured during executing of '{command}'")

def create_lvm(config):
    '''
    Dieses Programm:

    Lädt den JSON-Hash, der die LVM-Konfiguration enthält.
    Erstellt physikalische Volumes (PVs) mit pvcreate.
    Erstellt Volume Groups (VGs) mit vgcreate.
    Erstellt logische Volumes (LVs) mit lvcreate.
    Erstellt Dateisysteme auf den logischen Volumes mit mkfs oder mkswap.
    Mountet die logischen Volumes an die entsprechenden Verzeichnisse.
    '''
    for vg in config:
        vg_name = vg['name']
        pv_names = [pv['name'] for pv in vg['physicalVolumes']]

        # Create Physical Volumes (PVs)
        for pv in pv_names:
            result = run(["pvs", pv])
            if result.returncode != 0:
                run_command(f"pvcreate {pv}")

        # Create Volume Group (VG)
        pv_string = ' '.join(pv_names)
        if not os.path.exists(f"/dev/{vg_name}"):
            run_command(f"vgcreate {vg_name} {pv_string}")

        # Create Logical Volumes (LVs)
        for lv in vg['logicalVolumes']:
            lv_name = lv['name']
            if os.path.exists(f"/dev/{vg_name}/{lv_name}"):
                continue
            lv_size = lv['size']
            run_command(f"lvcreate -v -n {lv_name} -L {lv_size}B {vg_name}")
            # Create Filesystem
            lv_path = f"/dev/{vg_name}/{lv_name}"
            if lv['fileSystem'] == 'swap':
                run_command(f"mkswap {lv_path}")
            else:
                run_command(f"mkfs.{lv['fileSystem']} {lv_path}")

            # Mount the Logical Volume
            if lv['mountPoint'] != 'swap':
                run_command(f"mkdir -p {lv['mountPoint']}")
                run_command(f"mount {lv_path} {lv['mountPoint']}")
                with open('/etc/fstab','r+') as fstab:
                    if not re.findall(lv_path, fstab.read()):
                        fstab.seek(0, 2)
                        fstab.write(f"{lv_path} {lv['mountPoint']} {lv['fileSystem']} defaults 0 0\n")

def do_partitions():
    global params
    print('Start partitioning')
    # First search the best fitting partitioning file.
    lvm = json.load(open(find_hana_partitioning()))
    # If params.device is set replace the first physicalVolumes whit this
    if 'device' in params and params['device'] != '':
        lvm[0]['physicalVolumes'] = [{ "name": params['device']}]
    # Now parse the LVM and calculate the size based on size_min size_max and RAM*N
    for vg in lvm:
        if [pv['name'] for pv in vg['physicalVolumes']] == []:
            free_slot = find_largest_free_slot(False)
            print(free_slot)
            if free_slot['free'] == 0:
                raise Exception('There is no free place to create the necessary LVG')
            # TODO be able to use free place on partitionde disk: find_largest_free_slot(True)
            vg['physicalVolumes'] = [{ "name": free_slot['name']}]
        vg_size = get_vg_size([pv['name'] for pv in vg['physicalVolumes']])
        for lv in vg['logicalVolumes']:
            size_min = parse_disk_size(lv.get('size_min','0B'),vg_size)
            size_max = parse_disk_size(lv.get('size_max','0B'),vg_size)
            size = parse_disk_size(lv.get('size','0B'), vg_size)
            size = max(size_min, size)
            if size_max > 0 and size_max < size:
                size = size_max
            lv['size'] = size
        # Now we calculate the resulting overall size
        res_size=0
        for lv in vg['logicalVolumes']:
            res_size = res_size + lv['size']
        # Replace the first 0 size by the resulting free place
        for lv in vg['logicalVolumes']:
            if lv['size'] == 0:
                lv['size'] = vg_size - res_size
                break
    print("Resulting partitions plan:",lvm)
    # Now lets create the partitions
    create_lvm(lvm)
    run_command(MAKE_HANA_SHARES.format(sid=params['sid']))

def mount_sources(what):
    print('Mount sources')
    global base_dir, params
    parsed_url = urlparse(params["hanaUrlProtocol"] + params["hanaUrlPath"])
    base_dir = f"/tmp/sap_data/{what}"
    tmp_dir = Popen('mktemp -d /tmp/XXXXXXXXXX', shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT).stdout.read().strip()
    if what == "product":
        parsed_url = urlparse(params["productUrlProtocol"] + params["productUrlPath"])
    if parsed_url.scheme == "nfs":
        run_command(f"mkdir -p {base_dir}")
        run_command("mount -o ro {0}:{1} {2}".format(parsed_url.hostname, parsed_url.path, tmp_dir))
        run_command("rsync -a {tmp_dir}/ {base_dir}/")
        run_command("umount {tmp_dir}")
        run_command("rm -rf {tmp_dir}")
    if parsed_url.scheme == "smb":
        #TODOD
        print("geht noch nicht")
    if parsed_url.scheme == "file":
        print(parsed_url.path)
        base_dir = parsed_url.path
    print(f"Sources of the installation are in {base_dir}")

def install_hana():
    print("Start hana installation")
    with open(PWD_XML_PATH,"w") as f:
        f.write(PWD_XML.format(params["adminPw"]))
    with open("/run/inst_hana.sh","w") as f:
        f.write(
            INSTALL_HANA.format(
                pwdXml = PWD_XML,
                baseDir = base_dir,
                sid = params['sid'],
                instNumber = params['instNumber'],
                xsRouting = params['xsRouting'],
                xsDomain = params['xsDomain'],
                dummy = '{}'
                )
            )
    os.system("chmod 750 /run/inst_hana.sh")
    p = Popen('/run/inst_hana.sh', shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT)
    for line in p.stdout.readlines():
        print(line.decode(), end="")
    print("Hana installation finished with exit code: {0}".format(p.wait()))

def install_product():
    if os.path.exists(f"{base_dir}/info.txt"):
        with open(f"{base_dir}/b1h_properties","w") as f:
            f.write(
                B1_PROPERTIES.format(
                    HOSTNAME = socket.getfqdn(),
                    adminPw = params['adminPw'],
                    xsDomain = params['xsDomain'],
                    sid = params['sid'],
                    lsid = params['sid'].lower(),
                    instNumber = params['instNumber']
                )
            )

def do_install():
    do_partitions()
    mount_sources("hana")
    install_hana()
    if params['hanaUrlProtocol'] != "" and params['hanaUrlPath'] != "":
        mount_sources("product")
        install_product()

def do_remote_install(hostname):
    command = f"ssh {hostname} mkdir -p /usr/share/cockpit/cockpit-sap/"
    run_command(command)
    command = f"rsync -a /usr/share/cockpit/cockpit-sap/bin /usr/share/cockpit/cockpit-sap/data {hostname}:/usr/share/cockpit/cockpit-sap/"
    run_command(command)
    p = Popen(["ssh",hostname,"/usr/share/cockpit/cockpit-sap/bin/sap_install.py"], stdin=PIPE, stdout=PIPE, stderr=STDOUT, text=True)
    p.stdin.write(json.dumps(params))
    p.stdin.close()
    for line in p.stdout.readlines():
        print(f"{hostname} => {line}", end="")

# MAIN()
# Let's start do
if __name__ == "__main__":
    params = json.load(sys.stdin)
    hosts = params['hosts'].split()
    params['hosts'] = ""
    if 'master' in params:
        sys.stdout = open(params['logFile'],'w',buffering=1)
        del params['master']

    print("Start installation with following parameters:")
    print(params)
    if len(hosts) > 0:
        for host in hosts:
            if host != 'localhost': 
                process = multiprocessing.Process(target=do_remote_install, args=[host])
                process.start()
                process.join()
            else:
                do_install()
        #processes = [multiprocessing.Process(target=do_remote_install, args=[host]) for host in hosts]
        #for process in processes:
        #    process.start()
        #for process in processes:
        #    process.join()
    else:
        do_install()

    if len(hosts) == 0:
        print(os.open(params['logFile'],'r').read())
    else:
        print("Installation finished. Read the log to evaluate the result.")
