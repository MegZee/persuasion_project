# Deployment Guide

### Deploy Front End: 
```
API_URL=https://3.107.6.91.nip.io npx sst deploy --stage prod
```

3.107.6.91 is the AWS public ipv4 address and it will change every time the instance is restarted

### Connecting to the Instance:
```
ssh facebook-ads-ec2
```

### SCP
```
scp /path/to/local/file facebook-ads-ec2:~/
```

## Guide Backend

1. SSH into the machine
2. pull if needed
3. SCP new cache files if needed
4. go into backend folder and activate venv: `source .venv/bin/activate`
5. run the python server with: `nohup flask --app api run --debug --host=0.0.0.0 --port=5000 > flask.log 2>&1 &`
6. `sudo caddy start` from the `~` folder


	
### Caddy File

Caddy acts as a reverse proxy, routing incoming requests from 3.107.6.91.nip.io (a domain that resolves to your EC2's public IP) to your Flask application running locally on port 5000, while also handling HTTPS certificates automatically.
```
13.54.44.160.nip.io {
        reverse_proxy localhost:5000
}
```