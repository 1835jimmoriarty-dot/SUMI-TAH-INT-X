import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PERMISSIONS, SYSTEM_ROLES, ROLE_PERMISSIONS_MAP } from "../src/lib/rbac";
import { encryptSecret } from "../src/lib/encryption";
import { defangIOC } from "../src/lib/ioc-engine";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SUMI-TAH Enterprise Seed Database...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: "global-soc" },
    update: {},
    create: {
      name: "Global Security Operations Center",
      slug: "global-soc",
      description: "Primary enterprise cyber defense and threat hunting workspace",
    },
  });
  console.log("✓ Organization created:", org.name);

  // 2. Create Permissions
  const permEntries = Object.entries(PERMISSIONS);
  const permissionRecords: Record<string, string> = {};

  for (const [key, permName] of permEntries) {
    const [res, act] = permName.split(":");
    const record = await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: {
        name: permName,
        resource: res,
        action: act,
        description: `Allows ${act} operations on ${res}`,
      },
    });
    permissionRecords[permName] = record.id;
  }
  console.log(`✓ Seeded ${permEntries.length} granular system permissions`);

  // 3. Create Roles & RolePermissions
  const adminRole = await prisma.role.upsert({
    where: { name: SYSTEM_ROLES.SECURITY_ADMIN },
    update: {},
    create: {
      name: SYSTEM_ROLES.SECURITY_ADMIN,
      displayName: "Security Administrator",
      description: "Full administrative access across all SOC systems, integrations, audit and users",
      isSystem: true,
    },
  });

  const hunterRole = await prisma.role.upsert({
    where: { name: SYSTEM_ROLES.LEAD_HUNTER },
    update: {},
    create: {
      name: SYSTEM_ROLES.LEAD_HUNTER,
      displayName: "Lead Threat Hunter",
      description: "Advanced hunting, hypothesis testing, query engineering, and case investigation",
      isSystem: true,
    },
  });

  // Assign permissions to Admin
  for (const permName of ROLE_PERMISSIONS_MAP[SYSTEM_ROLES.SECURITY_ADMIN]) {
    const permId = permissionRecords[permName];
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: permId },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: permId },
      });
    }
  }

  // Assign permissions to Lead Hunter
  for (const permName of ROLE_PERMISSIONS_MAP[SYSTEM_ROLES.LEAD_HUNTER]) {
    const permId = permissionRecords[permName];
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: hunterRole.id, permissionId: permId },
        },
        update: {},
        create: { roleId: hunterRole.id, permissionId: permId },
      });
    }
  }
  console.log("✓ Configured RBAC roles and permissions");

  // 4. Create Demo Users
  const adminSalt = await bcrypt.genSalt(12);
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", adminSalt);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@sumitah.local" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "admin@sumitah.local",
      name: "Alex Sterling (SecAdmin)",
      title: "Chief Information Security Officer / SOC Director",
      passwordHash: adminPasswordHash,
      orgId: org.id,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  const hunterSalt = await bcrypt.genSalt(12);
  const hunterPasswordHash = await bcrypt.hash("HunterPassword123!", hunterSalt);

  const hunterUser = await prisma.user.upsert({
    where: { email: "hunter@sumitah.local" },
    update: { passwordHash: hunterPasswordHash },
    create: {
      email: "hunter@sumitah.local",
      name: "Morgan Vance (Hunter)",
      title: "Principal Threat Hunting Lead",
      passwordHash: hunterPasswordHash,
      orgId: org.id,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hunterUser.id, roleId: hunterRole.id } },
    update: {},
    create: { userId: hunterUser.id, roleId: hunterRole.id },
  });
  console.log("✓ Seeded demo accounts: admin@sumitah.local and hunter@sumitah.local");

  // 5. Seed MITRE ATT&CK Matrix Techniques
  const attackTechniques = [
    { techniqueId: "T1059", name: "Command and Scripting Interpreter", tactic: "Execution", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1059/" },
    { techniqueId: "T1059.001", name: "PowerShell", tactic: "Execution", isSubTechnique: true, parentTechId: "T1059", url: "https://attack.mitre.org/techniques/T1059/001/" },
    { techniqueId: "T1059.003", name: "Windows Command Shell", tactic: "Execution", isSubTechnique: true, parentTechId: "T1059", url: "https://attack.mitre.org/techniques/T1059/003/" },
    { techniqueId: "T1078", name: "Valid Accounts", tactic: "Defense Evasion", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1078/" },
    { techniqueId: "T1078.002", name: "Domain Accounts", tactic: "Defense Evasion", isSubTechnique: true, parentTechId: "T1078", url: "https://attack.mitre.org/techniques/T1078/002/" },
    { techniqueId: "T1003", name: "OS Credential Dumping", tactic: "Credential Access", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1003/" },
    { techniqueId: "T1003.001", name: "LSASS Memory", tactic: "Credential Access", isSubTechnique: true, parentTechId: "T1003", url: "https://attack.mitre.org/techniques/T1003/001/" },
    { techniqueId: "T1558", name: "Steal or Forge Kerberos Tickets", tactic: "Credential Access", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1558/" },
    { techniqueId: "T1558.003", name: "Kerberoasting", tactic: "Credential Access", isSubTechnique: true, parentTechId: "T1558", url: "https://attack.mitre.org/techniques/T1558/003/" },
    { techniqueId: "T1053", name: "Scheduled Task/Job", tactic: "Persistence", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1053/" },
    { techniqueId: "T1053.005", name: "Scheduled Task", tactic: "Persistence", isSubTechnique: true, parentTechId: "T1053", url: "https://attack.mitre.org/techniques/T1053/005/" },
    { techniqueId: "T1021", name: "Remote Services", tactic: "Lateral Movement", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1021/" },
    { techniqueId: "T1021.002", name: "SMB/Windows Admin Shares", tactic: "Lateral Movement", isSubTechnique: true, parentTechId: "T1021", url: "https://attack.mitre.org/techniques/T1021/002/" },
    { techniqueId: "T1071", name: "Application Layer Protocol", tactic: "Command and Control", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1071/" },
    { techniqueId: "T1071.001", name: "Web Protocols (HTTP/S)", tactic: "Command and Control", isSubTechnique: true, parentTechId: "T1071", url: "https://attack.mitre.org/techniques/T1071/001/" },
    { techniqueId: "T1566", name: "Phishing", tactic: "Initial Access", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1566/" },
    { techniqueId: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1190/" },
    { techniqueId: "T1486", name: "Data Encrypted for Impact", tactic: "Impact", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1486/" },
    { techniqueId: "T1041", name: "Exfiltration Over C2 Channel", tactic: "Exfiltration", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1041/" },
    { techniqueId: "T1083", name: "File and Directory Discovery", tactic: "Discovery", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1083/" },
    { techniqueId: "T1114", name: "Email Collection", tactic: "Collection", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1114/" },
    { techniqueId: "T1595", name: "Active Scanning", tactic: "Reconnaissance", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1595/" },
    { techniqueId: "T1583", name: "Acquire Infrastructure", tactic: "Resource Development", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1583/" },
    { techniqueId: "T1068", name: "Exploitation for Privilege Escalation", tactic: "Privilege Escalation", isSubTechnique: false, url: "https://attack.mitre.org/techniques/T1068/" },
  ];

  for (const tech of attackTechniques) {
    await prisma.mitreAttack.upsert({
      where: { techniqueId: tech.techniqueId },
      update: {},
      create: {
        techniqueId: tech.techniqueId,
        name: tech.name,
        tactic: tech.tactic,
        description: `Adversaries leverage ${tech.name} (${tech.techniqueId}) to achieve ${tech.tactic} goals.`,
        isSubTechnique: tech.isSubTechnique,
        parentTechId: tech.parentTechId,
        url: tech.url,
        detectionCount: ["T1059.001", "T1003.001", "T1558.003", "T1071.001"].includes(tech.techniqueId) ? 3 : 1,
      },
    });
  }
  console.log(`✓ Seeded ${attackTechniques.length} MITRE ATT&CK techniques`);

  // 6. Seed MITRE D3FEND Countermeasures
  const defendItems = [
    { defendId: "D3-MFA", name: "Multi-Factor Authentication", tactic: "Harden", attackLinks: JSON.stringify(["T1078", "T1078.002"]) },
    { defendId: "D3-PSA", name: "Process Spawn Analysis", tactic: "Detect", attackLinks: JSON.stringify(["T1059", "T1059.001", "T1059.003"]) },
    { defendId: "D3-LSA", name: "LSA Protection Enforcement", tactic: "Harden", attackLinks: JSON.stringify(["T1003", "T1003.001"]) },
    { defendId: "D3-EBL", name: "Encrypted Beacon Locator", tactic: "Detect", attackLinks: JSON.stringify(["T1071", "T1071.001"]) },
    { defendId: "D3-HNI", name: "Host Network Isolation", tactic: "Isolate", attackLinks: JSON.stringify(["T1021", "T1021.002", "T1041"]) },
    { defendId: "D3-DNS", name: "DNS Sinkhole Redirection", tactic: "Deceive", attackLinks: JSON.stringify(["T1071", "T1583"]) },
  ];

  for (const def of defendItems) {
    await prisma.mitreDefend.upsert({
      where: { defendId: def.defendId },
      update: {},
      create: {
        defendId: def.defendId,
        name: def.name,
        tactic: def.tactic,
        description: `D3FEND countermeasure ${def.name} provides active defense capabilities.`,
        attackLinks: def.attackLinks,
        url: `https://d3fend.mitre.org/technique/${def.defendId}/`,
      },
    });
  }
  console.log("✓ Seeded MITRE D3FEND defensive countermeasures");

  // 7. Seed Threat Actors & Malware
  const apt29 = await prisma.threatActor.upsert({
    where: { name: "APT29 (Cozy Bear)" },
    update: {},
    create: {
      name: "APT29 (Cozy Bear)",
      originCountry: "Russian Federation",
      motivation: "State Espionage & Intelligence Collection",
      firstObserved: "2008",
      targetSectors: JSON.stringify(["Government", "Defense", "Think Tanks", "Technology", "Healthcare"]),
      description: "Highly sophisticated adversary attributed to Russia's Foreign Intelligence Service (SVR). Known for stealthy tradecraft, OAuth token abuse, and supply chain intrusions.",
      confidenceRate: 95,
    },
  });

  await prisma.actorAlias.upsert({
    where: { actorId_alias: { actorId: apt29.id, alias: "Midnight Blizzard" } },
    update: {},
    create: { actorId: apt29.id, alias: "Midnight Blizzard" },
  });
  await prisma.actorAlias.upsert({
    where: { actorId_alias: { actorId: apt29.id, alias: "Nobelium" } },
    update: {},
    create: { actorId: apt29.id, alias: "Nobelium" },
  });

  const voltTyphoon = await prisma.threatActor.upsert({
    where: { name: "Volt Typhoon" },
    update: {},
    create: {
      name: "Volt Typhoon",
      originCountry: "People's Republic of China",
      motivation: "Critical Infrastructure Pre-positioning & Sabotage",
      firstObserved: "2021",
      targetSectors: JSON.stringify(["Energy", "Water", "Transportation", "Telecommunications", "Defense"]),
      description: "State-sponsored cyber group focused on long-term espionage and operational pre-positioning across critical infrastructure utilizing Living-off-the-Land (LotL) techniques.",
      confidenceRate: 90,
    },
  });

  const cobaltStrike = await prisma.malware.upsert({
    where: { name: "Cobalt Strike Beacon" },
    update: {},
    create: {
      name: "Cobalt Strike Beacon",
      category: "C2 Implant / Adversary Emulation Framework",
      description: "Commercial adversary simulation software frequently weaponized by APT and ransomware actors for post-exploitation command and control.",
      platforms: JSON.stringify(["Windows", "Linux"]),
      firstSeen: "2012",
      attackTags: JSON.stringify(["T1071.001", "T1059.001", "T1003.001"]),
    },
  });

  const mimikatz = await prisma.malware.upsert({
    where: { name: "Mimikatz" },
    update: {},
    create: {
      name: "Mimikatz",
      category: "Credential Dumping Tool",
      description: "Open-source credential harvesting tool that extracts plaintext passwords, hash digests, and Kerberos tickets from LSASS process memory.",
      platforms: JSON.stringify(["Windows"]),
      firstSeen: "2011",
      attackTags: JSON.stringify(["T1003.001", "T1558.003"]),
    },
  });

  await prisma.campaign.upsert({
    where: { name: "Operation GhostWriter" },
    update: {},
    create: {
      name: "Operation GhostWriter",
      actorId: apt29.id,
      malwareId: cobaltStrike.id,
      timeline: "2024 - Present",
      description: "Coordinated credential harvesting and persistence campaign targeting diplomatic and defense supply chain networks.",
      status: "ACTIVE",
      targetScope: JSON.stringify(["North America", "NATO Allies", "Defense Industrial Base"]),
    },
  });
  console.log("✓ Seeded Threat Actors, Malware, Aliases, and Campaigns");

  // 8. Seed Hunt Packages & Hypotheses
  const huntPackage = await prisma.huntPackage.upsert({
    where: { id: "pkg-kerberoast-001" },
    update: {},
    create: {
      id: "pkg-kerberoast-001",
      title: "Active Directory Kerberoasting & SPN Abuse Hunt",
      summary: "Detects offline brute-force attacks against Active Directory Service Principal Names requesting RC4 encryption.",
      category: "Credential Access",
      attackTags: JSON.stringify(["T1558.003", "T1078.002"]),
      telemetryReq: "Windows Security Event Logs (Event ID 4769 - Ticket Encryption Type 0x17)",
      instructions: "1. Query SIEM for Event ID 4769 where TicketEncryptionType=0x17 and ServiceName does not equal krbtgt.\n2. Identify accounts requesting tickets for more than 5 distinct SPNs within 10 minutes.\n3. Validate whether originating workstation is legitimate.",
      defaultQuery: 'index=wineventlog EventCode=4769 Ticket_Encryption_Type=0x17 Service_Name!="krbtgt" | stats count by TargetUserName, Service_Name, Client_Address | where count > 3',
      targetSIEM: "SPLUNK",
      version: "1.2.0",
      isBuiltin: true,
    },
  });

  const hypothesis = await prisma.hypothesis.create({
    data: {
      orgId: org.id,
      authorId: hunterUser.id,
      title: "RC4 Kerberos Ticket Downgrade Attack against Service Accounts",
      statement: "Adversaries are actively requesting Kerberos TGS service tickets using legacy RC4 encryption (0x17) to conduct offline ticket hash cracking.",
      rationale: "Recent intelligence highlights threat groups targeting unconstrained Active Directory delegations and high-privilege service accounts.",
      status: "VALIDATED",
      confidence: "HIGH",
      attackTags: JSON.stringify(["T1558.003", "T1003.001"]),
    },
  });

  const hunt = await prisma.hunt.create({
    data: {
      orgId: org.id,
      hypothesisId: hypothesis.id,
      packageId: huntPackage.id,
      leadId: hunterUser.id,
      title: "Operation NightWatch: Enterprise Kerberoast Sweep",
      description: "Enterprise-wide hunt across Tier-0 domain controllers for anomalous Kerberos TGS ticket activity.",
      stage: "COMPLETED",
      verdict: "THREAT_CONFIRMED",
      telemetryReq: "DC Security Event Log 4769, Sysmon Event 1",
      conclusion: "Confirmed 3 service accounts subjected to unauthorized TGS requests from compromised workstation AZ-WORKSTATION-88.",
      startedAt: new Date(Date.now() - 86400000 * 2),
      completedAt: new Date(Date.now() - 3600000),
    },
  });

  const finding = await prisma.finding.create({
    data: {
      huntId: hunt.id,
      title: "Malicious TGS Request Burst from Workstation 10.0.12.99",
      description: "Host AZ-WORKSTATION-88 issued 14 Kerberos TGS requests with encryption type 0x17 within 42 seconds for domain admin service accounts.",
      severity: "CRITICAL",
      status: "ESCALATED_TO_CASE",
      rawEvent: JSON.stringify({
        EventId: 4769,
        TargetUserName: "svc_mssql_admin",
        ClientAddress: "10.0.12.99",
        TicketOptions: "0x40810000",
        TicketEncryptionType: "0x17",
      }),
    },
  });

  const sampleEvidence = "LOG EVENT: 2026-09-01T14:22:19.412Z [SEC-AUDIT-4769] Target=svc_mssql_admin Host=AZ-WORKSTATION-88 EncType=0x17";
  const evidenceHash = crypto.createHash("sha256").update(sampleEvidence).digest("hex");

  await prisma.evidence.create({
    data: {
      huntId: hunt.id,
      findingId: finding.id,
      title: "DC01 Kerberos TGS Raw Log Dump",
      type: "LOG_SNIPPET",
      content: sampleEvidence,
      sha256Hash: evidenceHash,
      metadata: JSON.stringify({ sourceHost: "DC01.corp.internal", parser: "Wineventlog" }),
    },
  });

  // 9. Seed Incident Case
  const incidentCase = await prisma.case.create({
    data: {
      orgId: org.id,
      huntId: hunt.id,
      assigneeId: hunterUser.id,
      title: "INC-2026-0891: Kerberoasting & Unauthorized SPN Harvesting on DC01",
      description: "Investigation initiated following confirmed Kerberoasting sweep from AZ-WORKSTATION-88 targeting privileged database service accounts.",
      severity: "CRITICAL",
      priority: "P1",
      status: "OPEN",
      verdict: "TRUE_POSITIVE",
      summary: "Adversary gained initial foothold on workstation and executed automated Kerberoasting attack. Containment required.",
    },
  });

  await prisma.caseComment.create({
    data: {
      caseId: incidentCase.id,
      authorId: hunterUser.id,
      comment: "Host AZ-WORKSTATION-88 isolated via SOAR pending forensic triage.",
    },
  });

  await prisma.caseAction.create({
    data: {
      caseId: incidentCase.id,
      actorName: "Morgan Vance (Hunter)",
      action: "Created Incident Case from Hunt Finding",
      details: "Escalated Finding 'Malicious TGS Request Burst' to P1 active case.",
    },
  });

  // 10. Seed SOAR Actions (Demonstrating Human-in-the-Loop Mandatory Approval)
  await prisma.sOARAction.create({
    data: {
      caseId: incidentCase.id,
      actionType: "ISOLATE_HOST",
      target: "AZ-WORKSTATION-88",
      rationale: "Prevent active credential extraction and lateral movement to domain controllers.",
      status: "PENDING_APPROVAL",
      requesterId: hunterUser.id,
      parameters: JSON.stringify({ isolationType: "FULL_NETWORK_EXCEPT_EDR" }),
    },
  });

  await prisma.sOARAction.create({
    data: {
      caseId: incidentCase.id,
      actionType: "BLOCK_IP",
      target: "185.220.101.5",
      rationale: "Known adversary C2 beacon destination identified in proxy logs.",
      status: "EXECUTED",
      requesterId: hunterUser.id,
      approverId: adminUser.id,
      approvedAt: new Date(),
      executedAt: new Date(),
      executionLog: "[SUCCESS] Edge firewall rule added to block 185.220.101.5/32 on all ingress/egress boundaries.",
    },
  });

  // 11. Seed IOCs (All 15 Types)
  const iocList = [
    { type: "IPV4", val: "185.220.101.5", rep: "MALICIOUS", score: 95, tags: ["C2", "Tor Exit", "CobaltStrike"] },
    { type: "IPV4", val: "194.26.29.112", rep: "HIGH_RISK", score: 82, tags: ["WebShell", "Scanner"] },
    { type: "IPV6", val: "2001:0db8:85a3:0000:0000:8a2e:0370:7334", rep: "SUSPICIOUS", score: 55, tags: ["IPv6 Egress", "Anomalous"] },
    { type: "DOMAIN", val: "darkgate-payload-delivery.com", rep: "MALICIOUS", score: 92, tags: ["Malware Distribution", "DarkGate"] },
    { type: "DOMAIN", val: "auth-update-microsoft.net", rep: "HIGH_RISK", score: 85, tags: ["Typosquatting", "Phishing"] },
    { type: "URL", val: "https://evil-c2-node.org/beacon/v2", rep: "MALICIOUS", score: 98, tags: ["CobaltStrike", "Beacon"] },
    { type: "SHA256", val: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", rep: "MALICIOUS", score: 90, tags: ["Mimikatz", "LSASS Dumper"] },
    { type: "MD5", val: "44d88612fea8a8f36de82e1278abb02f", rep: "HIGH_RISK", score: 75, tags: ["Loader", "Stager"] },
    { type: "SHA1", val: "3395856ce81f2b7382dee72602f796b642dd5640", rep: "MALICIOUS", score: 88, tags: ["Ransomware Binary"] },
    { type: "EMAIL", val: "spearphish@apt29-ops.com", rep: "MALICIOUS", score: 94, tags: ["Spearphishing", "APT29"] },
    { type: "FILENAME", val: "svchost_updater.dll", rep: "HIGH_RISK", score: 78, tags: ["DLL Side-loading", "Masquerading"] },
    { type: "REGISTRY", val: "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WindowsUpdateCheck", rep: "MALICIOUS", score: 89, tags: ["Persistence", "RunKey"] },
    { type: "MUTEX", val: "Global\\MSWIN_DARKGATE_M99", rep: "MALICIOUS", score: 90, tags: ["DarkGate", "Mutex"] },
    { type: "CERTIFICATE", val: "a1:b2:c3:d4:e5:f6:07:18:29:3a:4b:5c:6d:7e:8f:90:11:22:33:44", rep: "SUSPICIOUS", score: 60, tags: ["Self-Signed", "C2 Cert"] },
    { type: "CVE", val: "CVE-2023-38831", rep: "HIGH_RISK", score: 88, tags: ["WinRAR RCE", "Weaponized"] },
    { type: "JA3", val: "771,4865-4866-4867-49195-49199,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0", rep: "HIGH_RISK", score: 76, tags: ["JA3 Fingerprint", "Go TLS Client"] },
    { type: "JA4", val: "t13d1516h2_8daaf6152771_0271dd94e078", rep: "MALICIOUS", score: 91, tags: ["JA4", "CobaltStrike TLS"] },
  ];

  for (const item of iocList) {
    const createdIoc = await prisma.iOC.upsert({
      where: { value: item.val },
      update: {},
      create: {
        type: item.type,
        value: item.val,
        normalizedVal: item.val.toLowerCase(),
        defangedVal: defangIOC(item.val),
        reputation: item.rep,
        score: item.score,
        confidence: 85,
        tags: JSON.stringify(item.tags),
      },
    });

    await prisma.iOCObservation.create({
      data: {
        iocId: createdIoc.id,
        source: "Splunk SIEM Correlation",
        context: "Observed in perimeter firewall and EDR logs during hunt sweep",
      },
    });
  }
  console.log("✓ Seeded comprehensive 15-type IOC threat intelligence library");

  // 12. Seed Multi-SIEM Queries
  await prisma.query.create({
    data: {
      title: "LogScale LQL: LSASS Memory Dumping Process Access",
      description: "Detects granted access rights 0x1010 or 0x1438 against lsass.exe process.",
      siemType: "LOGSCALE",
      language: "LQL",
      content: 'TargetProcess="lsass.exe" GrantedAccess=/0x1010|0x1438|0x1F3FFF/ | groupBy(SourceProcess, function=[count()])',
      attackTags: JSON.stringify(["T1003.001"]),
      authorId: hunterUser.id,
    },
  });

  await prisma.query.create({
    data: {
      title: "Sentinel KQL: Encoded PowerShell Execution with DownloadString",
      description: "Identifies base64 encoded PowerShell scripts executing web downloads.",
      siemType: "SENTINEL",
      language: "KQL",
      content: 'DeviceProcessEvents | where ProcessCommandLine contains "-EncodedCommand" or ProcessCommandLine contains "DownloadString" | project TimeGenerated, DeviceName, AccountName, ProcessCommandLine',
      attackTags: JSON.stringify(["T1059.001"]),
      authorId: hunterUser.id,
    },
  });

  await prisma.query.create({
    data: {
      title: "Splunk SPL: Kerberos TGS Downgrade to RC4",
      description: "Searches Event ID 4769 for ticket encryption type 0x17.",
      siemType: "SPLUNK",
      language: "SPL",
      content: 'index=wineventlog EventCode=4769 Ticket_Encryption_Type=0x17 Service_Name!="krbtgt" | stats count by TargetUserName, Service_Name, Client_Address',
      attackTags: JSON.stringify(["T1558.003"]),
      authorId: hunterUser.id,
    },
  });

  // 13. Seed Security Integration with AES-256-GCM Encrypted Secret
  const falconIntegration = await prisma.integration.create({
    data: {
      orgId: org.id,
      provider: "falcon",
      name: "CrowdStrike Falcon Enterprise EDR",
      description: "Real-time endpoint detection, telemetry ingestion, and containment capabilities.",
      isEnabled: true,
      configJson: JSON.stringify({ baseUrl: "https://api.crowdstrike.com", clientId: "CS-CLIENT-PROD-998" }),
    },
  });

  const secretPayload = encryptSecret("Demo-Encrypted-Falcon-Secret-Key-12345");
  await prisma.integrationSecret.create({
    data: {
      integrationId: falconIntegration.id,
      keyName: "CLIENT_SECRET",
      encryptedData: secretPayload.encryptedData,
      iv: secretPayload.iv,
      authTag: secretPayload.authTag,
    },
  });

  await prisma.connectorHealth.create({
    data: {
      integrationId: falconIntegration.id,
      status: "HEALTHY",
      latencyMs: 78,
      message: "OAuth2 authentication validated and token active.",
    },
  });

  console.log("✓ Seeded Security Integrations with encrypted secrets");
  console.log("🎉 SUMI-TAH database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });