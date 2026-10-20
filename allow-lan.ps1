# Run in an elevated PowerShell. Only allow private networks and local subnets.
New-NetFirewallRule -DisplayName 'Loud Speak LAN 3210' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3210 -Profile Private -RemoteAddress LocalSubnet
