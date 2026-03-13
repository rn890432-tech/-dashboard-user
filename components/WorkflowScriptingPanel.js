import React, { useState } from 'react';
// Expanded workflow templates
const templates = {
                boxrelay: 'if (boxRelayEvent) { trigger("boxrelay", { action: "Run Relay", details: boxRelayPayload }); }',
                dropboxpaper: 'if (dropboxPaperEvent) { trigger("dropboxpaper", { action: "Create Paper", details: dropboxPaperPayload }); }',
                slackapps: 'if (slackAppEvent) { trigger("slackapps", { action: "Run App", details: slackAppPayload }); }',
                teamsapps: 'if (teamsAppEvent) { trigger("teamsapps", { action: "Run App", details: teamsAppPayload }); }',
                googleworkspace: 'if (workspaceEvent) { trigger("googleworkspace", { action: "Automate Workspace", details: workspacePayload }); }',
                microsoftgraph: 'if (graphEvent) { trigger("microsoftgraph", { action: "Automate Graph", details: graphPayload }); }',
                saphana: 'if (hanaQueryNeeded) { trigger("saphana", { action: "Run Query", details: hanaPayload }); }',
                oraclecloud: 'if (oracleCloudEvent) { trigger("oraclecloud", { action: "Run Cloud Action", details: oracleCloudPayload }); }',
                ibmwatson: 'if (watsonEvent) { trigger("ibmwatson", { action: "Run Watson", details: watsonPayload }); }',
                servicenowflow: 'if (serviceNowFlowEvent) { trigger("servicenowflow", { action: "Run Flow", details: serviceNowFlowPayload }); }',
                salesforceflow: 'if (salesforceFlowEvent) { trigger("salesforceflow", { action: "Run Flow", details: salesforceFlowPayload }); }',
                hubspotworkflow: 'if (hubSpotWorkflowEvent) { trigger("hubspotworkflow", { action: "Run Workflow", details: hubSpotWorkflowPayload }); }',
                marketoflow: 'if (marketoFlowEvent) { trigger("marketoflow", { action: "Run Flow", details: marketoFlowPayload }); }',
                customrpa: 'if (rpaEvent) { trigger("customrpa", { action: "Run RPA", details: rpaPayload }); }',
                customiot: 'if (iotEvent) { trigger("customiot", { action: "Run IoT", details: iotPayload }); }',
                customblockchain: 'if (blockchainEvent) { trigger("customblockchain", { action: "Run Blockchain", details: blockchainPayload }); }',
                customedge: 'if (edgeEvent) { trigger("customedge", { action: "Run Edge Compute", details: edgePayload }); }',
                workspaceautomation: 'if (workspaceAutomationNeeded) { trigger("googleworkspace", { action: "Automate Workspace", details: workspacePayload }); trigger("microsoftgraph", { action: "Automate Graph", details: graphPayload }); trigger("slackapps", { action: "Run App", details: slackAppPayload }); trigger("teamsapps", { action: "Run App", details: teamsAppPayload }); }'
              bloomreach: 'if (bloomreachEvent) { trigger("bloomreach", { action: "Send Event", details: bloomreachPayload }); }',
              segmentpersonas: 'if (segmentPersonaUpdate) { trigger("segmentpersonas", { action: "Update Persona", details: segmentPersonaPayload }); }',
              twilioconversations: 'if (conversationNeeded) { trigger("twilioconversations", { action: "Start Conversation", details: twilioConversationPayload }); }',
              googlepubsub: 'if (pubsubEvent) { trigger("googlepubsub", { action: "Publish Message", details: pubsubPayload }); }',
              awssns: 'if (snsEvent) { trigger("awssns", { action: "Publish Message", details: snsPayload }); }',
              azureeventgrid: 'if (eventGridEvent) { trigger("azureeventgrid", { action: "Publish Event", details: eventGridPayload }); }',
              databricks: 'if (databricksJobNeeded) { trigger("databricks", { action: "Run Job", details: databricksPayload }); }',
              snowflake: 'if (snowflakeQueryNeeded) { trigger("snowflake", { action: "Run Query", details: snowflakePayload }); }',
              bigquery: 'if (bigQueryNeeded) { trigger("bigquery", { action: "Run Query", details: bigQueryPayload }); }',
              redshift: 'if (redshiftQueryNeeded) { trigger("redshift", { action: "Run Query", details: redshiftPayload }); }',
              mongodbatlas: 'if (mongoQueryNeeded) { trigger("mongodbatlas", { action: "Run Query", details: mongoPayload }); }',
              firebase: 'if (firebaseEvent) { trigger("firebase", { action: "Send Event", details: firebasePayload }); }',
              webhookrelay: 'if (relayEvent) { trigger("webhookrelay", { action: "Relay Webhook", details: relayPayload }); }',
              eventbus: 'if (busEvent) { trigger("eventbus", { action: "Send Event", details: busPayload }); }',
              datapipeline: 'if (pipelineNeeded) { trigger("datapipeline", { action: "Run Pipeline", details: pipelinePayload }); }',
              crosscloud: 'if (crossCloudNeeded) { trigger("crosscloud", { action: "Automate Across Clouds", details: crossCloudPayload }); }'
            plaid: 'if (bankSyncNeeded) { trigger("plaid", { action: "Sync Bank", details: plaidPayload }); }',
            stripeconnect: 'if (stripeConnectNeeded) { trigger("stripeconnect", { action: "Connect Account", details: stripeConnectPayload }); }',
            square: 'if (squarePaymentNeeded) { trigger("square", { action: "Create Payment", details: squarePayload }); }',
            paypal: 'if (paypalPaymentNeeded) { trigger("paypal", { action: "Create Payment", details: paypalPayload }); }',
            venmo: 'if (venmoPaymentNeeded) { trigger("venmo", { action: "Send Payment", details: venmoPayload }); }',
            wise: 'if (wiseTransferNeeded) { trigger("wise", { action: "Send Transfer", details: wisePayload }); }',
            revolut: 'if (revolutTransferNeeded) { trigger("revolut", { action: "Send Transfer", details: revolutPayload }); }',
            slackworkflow: 'if (slackWorkflowNeeded) { trigger("slackworkflow", { action: "Run Workflow", details: slackWorkflowPayload }); }',
            teamsworkflow: 'if (teamsWorkflowNeeded) { trigger("teamsworkflow", { action: "Run Workflow", details: teamsWorkflowPayload }); }',
            googlecloudfunctions: 'if (cloudFunctionNeeded) { trigger("googlecloudfunctions", { action: "Run Function", details: cloudFunctionPayload }); }',
            awslambda: 'if (lambdaNeeded) { trigger("awslambda", { action: "Run Lambda", details: lambdaPayload }); }',
            azurefunctions: 'if (azureFunctionNeeded) { trigger("azurefunctions", { action: "Run Function", details: azureFunctionPayload }); }',
            openai: 'if (openaiInferenceNeeded) { trigger("openai", { action: "Run Inference", details: openaiPayload }); }',
            anthropic: 'if (anthropicInferenceNeeded) { trigger("anthropic", { action: "Run Inference", details: anthropicPayload }); }',
            googlevertexai: 'if (vertexAIInferenceNeeded) { trigger("googlevertexai", { action: "Run Inference", details: vertexAIPayload }); }',
            huggingface: 'if (huggingFaceInferenceNeeded) { trigger("huggingface", { action: "Run Inference", details: huggingFacePayload }); }',
            customllm: 'if (llmOrchestrationNeeded) { trigger("customllm", { action: "Orchestrate LLM", details: llmPayload }); }',
            eventDriven: 'if (eventDetected) { trigger("openai", { action: "Run Inference", details: openaiPayload }); trigger("slackworkflow", { action: "Run Workflow", details: slackWorkflowPayload }); }',
            scheduled: 'if (scheduledTimeReached) { trigger("googlecloudfunctions", { action: "Run Function", details: cloudFunctionPayload }); trigger("paypal", { action: "Create Payment", details: paypalPayload }); }',
            adaptive: 'if (alerts.length > 30) { trigger("anthropic", { action: "Run Inference", details: anthropicPayload }); trigger("wise", { action: "Send Transfer", details: wisePayload }); trigger("teamsworkflow", { action: "Run Workflow", details: teamsWorkflowPayload }); }'
          calendly: 'if (meetingNeeded) { trigger("calendly", { action: "Schedule Meeting", details: calendlyPayload }); }',
          miro: 'if (miroBoardNeeded) { trigger("miro", { action: "Create Board", details: miroPayload }); }',
          figma: 'if (figmaDesignNeeded) { trigger("figma", { action: "Create Design", details: figmaPayload }); }',
          adobesign: 'if (adobeSignNeeded) { trigger("adobesign", { action: "Send Document", details: adobesignPayload }); }',
          surveymonkey: 'if (surveyNeeded) { trigger("surveymonkey", { action: "Send Survey", details: surveyPayload }); }',
          typeform: 'if (typeformNeeded) { trigger("typeform", { action: "Send Form", details: typeformPayload }); }',
          googleforms: 'if (googleFormNeeded) { trigger("googleforms", { action: "Send Form", details: googleFormPayload }); }',
          quickbooks: 'if (invoiceNeeded) { trigger("quickbooks", { action: "Create Invoice", details: quickbooksPayload }); }',
          xero: 'if (xeroInvoiceNeeded) { trigger("xero", { action: "Create Invoice", details: xeroPayload }); }',
          sap: 'if (sapOrderNeeded) { trigger("sap", { action: "Create Order", details: sapPayload }); }',
          oracleerp: 'if (oracleOrderNeeded) { trigger("oracleerp", { action: "Create Order", details: oraclePayload }); }',
          salesforcemarketing: 'if (campaignNeeded) { trigger("salesforcemarketing", { action: "Create Campaign", details: campaignPayload }); }',
          marketo: 'if (marketoCampaignNeeded) { trigger("marketo", { action: "Create Campaign", details: marketoPayload }); }',
          pipedrive: 'if (dealNeeded) { trigger("pipedrive", { action: "Create Deal", details: pipedrivePayload }); }',
          zoho: 'if (zohoLeadNeeded) { trigger("zoho", { action: "Create Lead", details: zohoPayload }); }',
          customai: 'if (aiInferenceNeeded) { trigger("customai", { action: "Run Inference", details: aiPayload }); }',
          customml: 'if (mlPipelineNeeded) { trigger("customml", { action: "Run Pipeline", details: mlPayload }); }',
          dynamicOrchestration: 'if (alerts.length > 25) { trigger("calendly", { action: "Schedule Meeting", details: calendlyPayload }); trigger("figma", { action: "Create Design", details: figmaPayload }); trigger("customai", { action: "Run Inference", details: aiPayload }); trigger("zoho", { action: "Create Lead", details: zohoPayload }); }'
        twiliovoice: 'if (voiceNeeded) { trigger("twiliovoice", { action: "Send Voice", details: voicePayload }); }',
        googlesheets: 'if (sheetUpdateNeeded) { trigger("googlesheets", { action: "Update Sheet", details: sheetPayload }); }',
        asana: 'if (asanaTaskNeeded) { trigger("asana", { action: "Create Task", details: asanaPayload }); }',
        trello: 'if (trelloCardNeeded) { trigger("trello", { action: "Create Card", details: trelloPayload }); }',
        monday: 'if (mondayItemNeeded) { trigger("monday", { action: "Create Item", details: mondayPayload }); }',
        freshdesk: 'if (freshdeskTicketNeeded) { trigger("freshdesk", { action: "Create Ticket", details: freshdeskPayload }); }',
        intercom: 'if (intercomMessageNeeded) { trigger("intercom", { action: "Send Message", details: intercomPayload }); }',
        segment: 'if (segmentTrackNeeded) { trigger("segment", { action: "Track Event", details: segmentPayload }); }',
        algolia: 'if (algoliaIndexNeeded) { trigger("algolia", { action: "Index Data", details: algoliaPayload }); }',
        sendgrid: 'if (sendgridEmailNeeded) { trigger("sendgrid", { action: "Send Email", details: sendgridPayload }); }',
        docusign: 'if (docusignSignNeeded) { trigger("docusign", { action: "Send Envelope", details: docusignPayload }); }',
        docusaurus: 'if (docusaurusUpdateNeeded) { trigger("docusaurus", { action: "Update Docs", details: docusaurusPayload }); }',
        notion: 'if (notionUpdateNeeded) { trigger("notion", { action: "Update Page", details: notionPayload }); }',
        airtable: 'if (airtableUpdateNeeded) { trigger("airtable", { action: "Update Record", details: airtablePayload }); }',
        zapier: 'if (zapierTriggerNeeded) { trigger("zapier", { action: "Trigger Zap", details: zapierPayload }); }',
        make: 'if (makeScenarioNeeded) { trigger("make", { action: "Run Scenario", details: makePayload }); }',
        customrest: 'if (restEvent) { trigger("customrest", { action: "Send REST", details: restPayload }); }',
        customgraphql: 'if (graphqlEvent) { trigger("customgraphql", { action: "Send GraphQL", details: graphqlPayload }); }',
        orchestration: 'if (alerts.length > 15) { trigger("slack", { text: "Critical alert spike!" }); trigger("asana", { action: "Create Task", details: asanaPayload }); trigger("sendgrid", { action: "Send Email", details: sendgridPayload }); trigger("zapier", { action: "Trigger Zap", details: zapierPayload }); }'
      zendesk: 'if (supportTickets.length > 10) { trigger("zendesk", { action: "Create Ticket", details: supportTickets }); }',
      jira: 'if (jiraIssues.length > 0) { trigger("jira", { action: "Create Issue", details: jiraIssues }); }',
      gitlab: 'if (gitlabEvents.length > 0) { trigger("gitlab", { action: "Trigger Pipeline", details: gitlabEvents }); }',
      bitbucket: 'if (bitbucketEvents.length > 0) { trigger("bitbucket", { action: "Trigger Build", details: bitbucketEvents }); }',
      awss3: 'if (s3UploadNeeded) { trigger("awss3", { action: "Upload File", details: s3Payload }); }',
      azureblob: 'if (blobUploadNeeded) { trigger("azureblob", { action: "Upload File", details: blobPayload }); }',
      googledrive: 'if (driveUploadNeeded) { trigger("googledrive", { action: "Upload File", details: drivePayload }); }',
      dropbox: 'if (dropboxUploadNeeded) { trigger("dropbox", { action: "Upload File", details: dropboxPayload }); }',
      servicebus: 'if (busEvent) { trigger("servicebus", { action: "Send Message", details: busPayload }); }',
      rabbitmq: 'if (rabbitEvent) { trigger("rabbitmq", { action: "Send Message", details: rabbitPayload }); }',
      kafka: 'if (kafkaEvent) { trigger("kafka", { action: "Send Message", details: kafkaPayload }); }',
      stripe: 'if (paymentNeeded) { trigger("stripe", { action: "Create Payment", details: paymentPayload }); }',
      shopify: 'if (orderNeeded) { trigger("shopify", { action: "Create Order", details: orderPayload }); }',
      hubspot: 'if (leadNeeded) { trigger("hubspot", { action: "Create Lead", details: leadPayload }); }',
      mailchimp: 'if (emailNeeded) { trigger("mailchimp", { action: "Send Campaign", details: emailPayload }); }',
      googlecalendar: 'if (calendarEvent) { trigger("googlecalendar", { action: "Create Event", details: calendarPayload }); }',
      onedrive: 'if (onedriveUploadNeeded) { trigger("onedrive", { action: "Upload File", details: onedrivePayload }); }',
      box: 'if (boxUploadNeeded) { trigger("box", { action: "Upload File", details: boxPayload }); }',
      webhook: 'if (webhookEvent) { trigger("webhook", { action: "Send Webhook", details: webhookPayload }); }',
      advancedLogic: 'if (alerts.length > 10 && sbom.some(dep=>dep.vulnScore>0.7)) { trigger("slack", { text: "Critical alert spike!" }); trigger("jira", { action: "Create Issue", details: jiraIssues }); trigger("stripe", { action: "Create Payment", details: paymentPayload }); trigger("webhook", { action: "Send Webhook", details: webhookPayload }); }'
    okta: 'if (userAuthFailures > 3) { trigger("okta", { action: "Lock User", details: failedUsers }); }',
    crowdstrike: 'if (crowdstrikeDetections.length > 0) { trigger("crowdstrike", { action: "Isolate Host", details: crowdstrikeDetections }); }',
    paloalto: 'if (firewallAlerts.length > 0) { trigger("paloalto", { action: "Block IP", details: firewallAlerts }); }',
    datadog: 'if (datadogIncidents.length > 0) { trigger("datadog", { action: "Send Alert", details: datadogIncidents }); }',
    pagerduty: 'if (incidentSeverity > 7) { trigger("pagerduty", { action: "Trigger Incident", details: incidentDetails }); }',
    twilio: 'if (smsNeeded) { trigger("twilio", { action: "Send SMS", details: smsPayload }); }',
    zoom: 'if (meetingAlert) { trigger("zoom", { action: "Create Meeting", details: meetingPayload }); }',
    slack: 'if (slackNotify) { trigger("slack", { action: "Send Message", details: slackPayload }); }',
    teams: 'if (teamsNotify) { trigger("teams", { action: "Send Message", details: teamsPayload }); }',
    customLogic: 'if (alerts.length > 5 && sbom.some(dep=>dep.vulnScore>0.5)) { trigger("email", { subject: "Multiple Issues", body: "Check dashboard." }); trigger("slack", { text: "Alert spike!" }); trigger("okta", { action: "Lock User", details: failedUsers }); }'
  alert: 'if (alerts.some(a=>a.severity>0.8)) { trigger("notify", { message: "High severity alert!" }); }',
  compliance: 'if (sbom.some(dep=>dep.vulnScore>0.7)) { trigger("email", { subject: "Compliance Issue", body: "Review required." }); }',
  traffic: 'if (trafficFlows.length > 20) { trigger("teams", { text: "Unusual traffic detected!" }); }',
  chain: 'if (alerts.length > 5) { trigger("slack", { text: "Alert spike!" }); trigger("siem", { event: "ALERT", details: { ... } }); }',
  multi: 'if (alerts.length > 10 && sbom.some(dep=>dep.vulnScore>0.5)) { trigger("email", { subject: "Multiple Issues", body: "Check dashboard." }); }',
  oracle: 'if (dbErrors.length > 0) { trigger("oracle", { action: "Start DB", details: dbErrors }); }',
  ibm: 'if (ibmEvents.length > 0) { trigger("ibm", { action: "Run Cloud Function", details: ibmEvents }); }',
  salesforce: 'if (salesLeads.length > 5) { trigger("salesforce", { action: "Create Lead", details: salesLeads }); }',
  servicenow: 'if (incidents.length > 0) { trigger("servicenow", { action: "Create Incident", details: incidents }); }',
  splunk: 'if (splunkAlerts.length > 0) { trigger("splunk", { action: "Send Alert", details: splunkAlerts }); }',
  elastic: 'if (elasticData.length > 0) { trigger("elastic", { action: "Index Data", details: elasticData }); }',
  custom: 'if (customCondition) { trigger("custom", { action: "Send REST", details: customPayload }); }'
};
// Expanded platform actions
const platformActions = {
                boxrelay: ['Run Relay', 'Custom Box Relay Action'],
                dropboxpaper: ['Create Paper', 'Custom Dropbox Paper Action'],
                slackapps: ['Run App', 'Custom Slack App Action'],
                teamsapps: ['Run App', 'Custom Teams App Action'],
                googleworkspace: ['Automate Workspace', 'Custom Workspace Action'],
                microsoftgraph: ['Automate Graph', 'Custom Graph Action'],
                saphana: ['Run Query', 'Custom SAP Hana Action'],
                oraclecloud: ['Run Cloud Action', 'Custom Oracle Cloud Action'],
                ibmwatson: ['Run Watson', 'Custom IBM Watson Action'],
                servicenowflow: ['Run Flow', 'Custom ServiceNow Flow Action'],
                salesforceflow: ['Run Flow', 'Custom Salesforce Flow Action'],
                hubspotworkflow: ['Run Workflow', 'Custom HubSpot Workflow Action'],
                marketoflow: ['Run Flow', 'Custom Marketo Flow Action'],
                customrpa: ['Run RPA', 'Custom RPA Action'],
                customiot: ['Run IoT', 'Custom IoT Action'],
                customblockchain: ['Run Blockchain', 'Custom Blockchain Action'],
                customedge: ['Run Edge Compute', 'Custom Edge Action'],
                workspaceautomation: ['Workspace Automation', 'Custom Workspace Automation Action'],
              bloomreach: ['Send Event', 'Custom Bloomreach Action'],
              segmentpersonas: ['Update Persona', 'Custom Segment Personas Action'],
              twilioconversations: ['Start Conversation', 'Custom Twilio Conversations Action'],
              googlepubsub: ['Publish Message', 'Custom Pub/Sub Action'],
              awssns: ['Publish Message', 'Custom SNS Action'],
              azureeventgrid: ['Publish Event', 'Custom Event Grid Action'],
              databricks: ['Run Job', 'Custom Databricks Action'],
              snowflake: ['Run Query', 'Custom Snowflake Action'],
              bigquery: ['Run Query', 'Custom BigQuery Action'],
              redshift: ['Run Query', 'Custom Redshift Action'],
              mongodbatlas: ['Run Query', 'Custom MongoDB Atlas Action'],
              firebase: ['Send Event', 'Custom Firebase Action'],
              webhookrelay: ['Relay Webhook', 'Custom Webhook Relay Action'],
              eventbus: ['Send Event', 'Custom Event Bus Action'],
              datapipeline: ['Run Pipeline', 'Custom Data Pipeline Action'],
              crosscloud: ['Automate Across Clouds', 'Custom Cross-Cloud Action'],
            plaid: ['Sync Bank', 'Custom Plaid Action'],
            stripeconnect: ['Connect Account', 'Custom Stripe Connect Action'],
            square: ['Create Payment', 'Refund Payment', 'Custom Square Action'],
            paypal: ['Create Payment', 'Refund Payment', 'Custom PayPal Action'],
            venmo: ['Send Payment', 'Custom Venmo Action'],
            wise: ['Send Transfer', 'Custom Wise Action'],
            revolut: ['Send Transfer', 'Custom Revolut Action'],
            slackworkflow: ['Run Workflow', 'Custom Slack Workflow Action'],
            teamsworkflow: ['Run Workflow', 'Custom Teams Workflow Action'],
            googlecloudfunctions: ['Run Function', 'Custom Google Cloud Function Action'],
            awslambda: ['Run Lambda', 'Custom AWS Lambda Action'],
            azurefunctions: ['Run Function', 'Custom Azure Function Action'],
            openai: ['Run Inference', 'Custom OpenAI Action'],
            anthropic: ['Run Inference', 'Custom Anthropic Action'],
            googlevertexai: ['Run Inference', 'Custom Vertex AI Action'],
            huggingface: ['Run Inference', 'Custom Hugging Face Action'],
            customllm: ['Orchestrate LLM', 'Custom LLM Action'],
            eventDriven: ['Event Trigger', 'Custom Event Action'],
            scheduled: ['Scheduled Trigger', 'Custom Scheduled Action'],
            adaptive: ['Adaptive Trigger', 'Custom Adaptive Action'],
          calendly: ['Schedule Meeting', 'Cancel Meeting', 'Custom Calendly Action'],
          miro: ['Create Board', 'Update Board', 'Custom Miro Action'],
          figma: ['Create Design', 'Update Design', 'Custom Figma Action'],
          adobesign: ['Send Document', 'Custom Adobe Sign Action'],
          surveymonkey: ['Send Survey', 'Custom SurveyMonkey Action'],
          typeform: ['Send Form', 'Custom Typeform Action'],
          googleforms: ['Send Form', 'Custom Google Forms Action'],
          quickbooks: ['Create Invoice', 'Update Invoice', 'Custom QuickBooks Action'],
          xero: ['Create Invoice', 'Update Invoice', 'Custom Xero Action'],
          sap: ['Create Order', 'Update Order', 'Custom SAP Action'],
          oracleerp: ['Create Order', 'Update Order', 'Custom Oracle ERP Action'],
          salesforcemarketing: ['Create Campaign', 'Update Campaign', 'Custom Salesforce Marketing Action'],
          marketo: ['Create Campaign', 'Update Campaign', 'Custom Marketo Action'],
          pipedrive: ['Create Deal', 'Update Deal', 'Custom Pipedrive Action'],
          zoho: ['Create Lead', 'Update Lead', 'Custom Zoho Action'],
          customai: ['Run Inference', 'Custom AI Action'],
          customml: ['Run Pipeline', 'Custom ML Action'],
          dynamicOrchestration: ['Dynamic Builder', 'AI-Driven Trigger', 'Custom Dynamic Action'],
        twiliovoice: ['Send Voice', 'Custom Twilio Voice Action'],
        googlesheets: ['Update Sheet', 'Read Sheet', 'Custom Sheets Action'],
        asana: ['Create Task', 'Update Task', 'Custom Asana Action'],
        trello: ['Create Card', 'Update Card', 'Custom Trello Action'],
        monday: ['Create Item', 'Update Item', 'Custom Monday Action'],
        freshdesk: ['Create Ticket', 'Update Ticket', 'Custom Freshdesk Action'],
        intercom: ['Send Message', 'Custom Intercom Action'],
        segment: ['Track Event', 'Custom Segment Action'],
        algolia: ['Index Data', 'Search Data', 'Custom Algolia Action'],
        sendgrid: ['Send Email', 'Custom SendGrid Action'],
        docusign: ['Send Envelope', 'Custom DocuSign Action'],
        docusaurus: ['Update Docs', 'Custom Docusaurus Action'],
        notion: ['Update Page', 'Custom Notion Action'],
        airtable: ['Update Record', 'Custom Airtable Action'],
        zapier: ['Trigger Zap', 'Custom Zapier Action'],
        make: ['Run Scenario', 'Custom Make Action'],
        customrest: ['Send REST', 'Custom REST Action'],
        customgraphql: ['Send GraphQL', 'Custom GraphQL Action'],
        orchestration: ['Parallel Execution', 'Sequential Execution', 'Conditional Execution', 'Custom Orchestration Action'],
      zendesk: ['Create Ticket', 'Update Ticket', 'Close Ticket', 'Custom Zendesk Action'],
      jira: ['Create Issue', 'Update Issue', 'Close Issue', 'Custom Jira Action'],
      gitlab: ['Trigger Pipeline', 'Cancel Pipeline', 'Custom GitLab Action'],
      bitbucket: ['Trigger Build', 'Cancel Build', 'Custom Bitbucket Action'],
      awss3: ['Upload File', 'Download File', 'Delete File', 'Custom S3 Action'],
      azureblob: ['Upload File', 'Download File', 'Delete File', 'Custom Blob Action'],
      googledrive: ['Upload File', 'Download File', 'Delete File', 'Custom Drive Action'],
      dropbox: ['Upload File', 'Download File', 'Delete File', 'Custom Dropbox Action'],
      servicebus: ['Send Message', 'Receive Message', 'Custom ServiceBus Action'],
      rabbitmq: ['Send Message', 'Receive Message', 'Custom RabbitMQ Action'],
      kafka: ['Send Message', 'Receive Message', 'Custom Kafka Action'],
      stripe: ['Create Payment', 'Refund Payment', 'Custom Stripe Action'],
      shopify: ['Create Order', 'Update Order', 'Custom Shopify Action'],
      hubspot: ['Create Lead', 'Update Lead', 'Custom HubSpot Action'],
      mailchimp: ['Send Campaign', 'Update Campaign', 'Custom Mailchimp Action'],
      googlecalendar: ['Create Event', 'Update Event', 'Custom Calendar Action'],
      onedrive: ['Upload File', 'Download File', 'Delete File', 'Custom OneDrive Action'],
      box: ['Upload File', 'Download File', 'Delete File', 'Custom Box Action'],
      webhook: ['Send Webhook', 'Custom Webhook Action'],
      advancedLogic: ['Multi-API Chain', 'Conditional Automation', 'Custom Advanced Action'],
    okta: ['Lock User', 'Unlock User', 'Reset MFA', 'Custom Okta Action'],
    crowdstrike: ['Isolate Host', 'Unisolate Host', 'Scan Host', 'Custom CrowdStrike Action'],
    paloalto: ['Block IP', 'Unblock IP', 'Update Policy', 'Custom Palo Alto Action'],
    datadog: ['Send Alert', 'Acknowledge Alert', 'Custom Datadog Action'],
    pagerduty: ['Trigger Incident', 'Resolve Incident', 'Acknowledge Incident', 'Custom PagerDuty Action'],
    twilio: ['Send SMS', 'Send Voice', 'Custom Twilio Action'],
    zoom: ['Create Meeting', 'End Meeting', 'Custom Zoom Action'],
    slack: ['Send Message', 'Archive Channel', 'Custom Slack Action'],
    teams: ['Send Message', 'Archive Channel', 'Custom Teams Action'],
    customLogic: ['Multi-Action Chain', 'Conditional Trigger', 'Custom Logic Action'],
  aws: ['Start EC2', 'Stop EC2', 'Trigger Lambda', 'Send SNS', 'List S3 Buckets', 'Custom AWS Action'],
  azure: ['Start VM', 'Stop VM', 'Run Function', 'Send EventGrid', 'List Storage', 'Custom Azure Action'],
  gcp: ['Start Compute', 'Stop Compute', 'Run Cloud Function', 'Send PubSub', 'List Buckets', 'Custom GCP Action'],
  github: ['Create Issue', 'Close Issue', 'Trigger Workflow', 'Send Webhook', 'List Repos', 'Custom GitHub Action'],
  oracle: ['Start DB', 'Stop DB', 'Run Procedure', 'Send Notification', 'Custom Oracle Action'],
  ibm: ['Start VM', 'Stop VM', 'Run Cloud Function', 'Send Message', 'Custom IBM Action'],
  salesforce: ['Create Lead', 'Update Contact', 'Send Notification', 'Custom Salesforce Action'],
  servicenow: ['Create Incident', 'Resolve Incident', 'Send Notification', 'Custom ServiceNow Action'],
  splunk: ['Search Logs', 'Send Alert', 'Custom Splunk Action'],
  elastic: ['Index Data', 'Search Data', 'Send Alert', 'Custom Elastic Action'],
  custom: ['Send REST', 'Send WebSocket', 'Custom Action', 'Ping Endpoint']
};

function WorkflowScriptingPanel() {
                const [backendPlatform, setBackendPlatform] = useState('custom');
                const [auditDeliverySchedule, setAuditDeliverySchedule] = useState('manual');
                const [auditDeliveryStatus, setAuditDeliveryStatus] = useState('');
                const [collabUsersList, setCollabUsersList] = useState([]);
                const [sessionTimeout, setSessionTimeout] = useState(30);
                const [activityLog, setActivityLog] = useState([]);
                const [adminOverride, setAdminOverride] = useState(false);
                const [backendUrl, setBackendUrl] = useState('');
                const [auditFormat, setAuditFormat] = useState('plain');
                const [auditTemplate, setAuditTemplate] = useState('[{time}] {user} {action} module {module}');
                const [auditPreview, setAuditPreview] = useState('');
                const [collabRole, setCollabRole] = useState('editor');
                const [collabPermission, setCollabPermission] = useState(true);
                const [collabCursor, setCollabCursor] = useState('');
                // Platform-specific actions
                const [platformAction, setPlatformAction] = useState('none');
                const platformActions = {
                  aws: ['Start EC2', 'Stop EC2', 'Trigger Lambda', 'Send SNS', 'List S3 Buckets', 'Custom AWS Action'],
                  azure: ['Start VM', 'Stop VM', 'Run Function', 'Send EventGrid', 'List Storage', 'Custom Azure Action'],
                  gcp: ['Start Compute', 'Stop Compute', 'Run Cloud Function', 'Send PubSub', 'List Buckets', 'Custom GCP Action'],
                  github: ['Create Issue', 'Close Issue', 'Trigger Workflow', 'Send Webhook', 'List Repos', 'Custom GitHub Action'],
                  custom: ['Send REST', 'Send WebSocket', 'Custom Action', 'Ping Endpoint']
                };
                const [customPlatformAction, setCustomPlatformAction] = useState('');
                const handlePlatformAction = async () => {
                                                                                                                                                // New orchestration flows: RPA, IoT, blockchain, edge compute, workspace automation
                                                                                                                                                if (platformAction === 'Run RPA' && backendUrl) {
                                                                                                                                                  await fetch(backendUrl + '/platform-action', {
                                                                                                                                                    method: 'POST',
                                                                                                                                                    headers: {'Content-Type': 'application/json'},
                                                                                                                                                    body: JSON.stringify({ platform: 'customrpa', action: 'Run RPA', details: { rpa: customPlatformAction } })
                                                                                                                                                  });
                                                                                                                                                  setWsStatus('RPA orchestration executed.');
                                                                                                                                                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'rpa-orchestration', time: new Date().toISOString(), detail: 'RPA run'}]);
                                                                                                                                                  return;
                                                                                                                                                }
                                                                                                                                                if (platformAction === 'Run IoT' && backendUrl) {
                                                                                                                                                  await fetch(backendUrl + '/platform-action', {
                                                                                                                                                    method: 'POST',
                                                                                                                                                    headers: {'Content-Type': 'application/json'},
                                                                                                                                                    body: JSON.stringify({ platform: 'customiot', action: 'Run IoT', details: { iot: customPlatformAction } })
                                                                                                                                                  });
                                                                                                                                                  setWsStatus('IoT orchestration executed.');
                                                                                                                                                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'iot-orchestration', time: new Date().toISOString(), detail: 'IoT run'}]);
                                                                                                                                                  return;
                                                                                                                                                }
                                                                                                                                                if (platformAction === 'Run Blockchain' && backendUrl) {
                                                                                                                                                  await fetch(backendUrl + '/platform-action', {
                                                                                                                                                    method: 'POST',
                                                                                                                                                    headers: {'Content-Type': 'application/json'},
                                                                                                                                                    body: JSON.stringify({ platform: 'customblockchain', action: 'Run Blockchain', details: { blockchain: customPlatformAction } })
                                                                                                                                                  });
                                                                                                                                                  setWsStatus('Blockchain orchestration executed.');
                                                                                                                                                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'blockchain-orchestration', time: new Date().toISOString(), detail: 'Blockchain run'}]);
                                                                                                                                                  return;
                                                                                                                                                }
                                                                                                                                                if (platformAction === 'Run Edge Compute' && backendUrl) {
                                                                                                                                                  await fetch(backendUrl + '/platform-action', {
                                                                                                                                                    method: 'POST',
                                                                                                                                                    headers: {'Content-Type': 'application/json'},
                                                                                                                                                    body: JSON.stringify({ platform: 'customedge', action: 'Run Edge Compute', details: { edge: customPlatformAction } })
                                                                                                                                                  });
                                                                                                                                                  setWsStatus('Edge compute orchestration executed.');
                                                                                                                                                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'edge-orchestration', time: new Date().toISOString(), detail: 'Edge compute run'}]);
                                                                                                                                                  return;
                                                                                                                                                }
                                                                                                                                                if (platformAction === 'Workspace Automation' && backendUrl) {
                                                                                                                                                  const actions = [
                                                                                                                                                    { platform: 'googleworkspace', action: 'Automate Workspace', details: { workspace: customPlatformAction } },
                                                                                                                                                    { platform: 'microsoftgraph', action: 'Automate Graph', details: { graph: customPlatformAction } },
                                                                                                                                                    { platform: 'slackapps', action: 'Run App', details: { app: customPlatformAction } },
                                                                                                                                                    { platform: 'teamsapps', action: 'Run App', details: { app: customPlatformAction } }
                                                                                                                                                  ];
                                                                                                                                                  await Promise.all(actions.map(act => fetch(backendUrl + '/platform-action', {
                                                                                                                                                    method: 'POST',
                                                                                                                                                    headers: {'Content-Type': 'application/json'},
                                                                                                                                                    body: JSON.stringify(act)
                                                                                                                                                  })));
                                                                                                                                                  setWsStatus('Workspace automation orchestration executed.');
                                                                                                                                                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'workspace-automation-orchestration', time: new Date().toISOString(), detail: actions}]);
                                                                                                                                                  return;
                                                                                                                                                }
                                                                                                                              // New orchestration types: webhook relay, event bus, data pipeline, cross-cloud automation
                                                                                                                              if (platformAction === 'Relay Webhook' && backendUrl) {
                                                                                                                                await fetch(backendUrl + '/platform-action', {
                                                                                                                                  method: 'POST',
                                                                                                                                  headers: {'Content-Type': 'application/json'},
                                                                                                                                  body: JSON.stringify({ platform: 'webhookrelay', action: 'Relay Webhook', details: { payload: customPlatformAction } })
                                                                                                                                });
                                                                                                                                setWsStatus('Webhook relay orchestration executed.');
                                                                                                                                setActivityLog([...activityLog, {user: editUser || 'system', action: 'webhook-relay-orchestration', time: new Date().toISOString(), detail: 'Webhook relayed'}]);
                                                                                                                                return;
                                                                                                                              }
                                                                                                                              if (platformAction === 'Send Event' && backendUrl) {
                                                                                                                                await fetch(backendUrl + '/platform-action', {
                                                                                                                                  method: 'POST',
                                                                                                                                  headers: {'Content-Type': 'application/json'},
                                                                                                                                  body: JSON.stringify({ platform: 'eventbus', action: 'Send Event', details: { event: customPlatformAction } })
                                                                                                                                });
                                                                                                                                setWsStatus('Event bus orchestration executed.');
                                                                                                                                setActivityLog([...activityLog, {user: editUser || 'system', action: 'event-bus-orchestration', time: new Date().toISOString(), detail: 'Event sent'}]);
                                                                                                                                return;
                                                                                                                              }
                                                                                                                              if (platformAction === 'Run Pipeline' && backendUrl) {
                                                                                                                                await fetch(backendUrl + '/platform-action', {
                                                                                                                                  method: 'POST',
                                                                                                                                  headers: {'Content-Type': 'application/json'},
                                                                                                                                  body: JSON.stringify({ platform: 'datapipeline', action: 'Run Pipeline', details: { pipeline: customPlatformAction } })
                                                                                                                                });
                                                                                                                                setWsStatus('Data pipeline orchestration executed.');
                                                                                                                                setActivityLog([...activityLog, {user: editUser || 'system', action: 'data-pipeline-orchestration', time: new Date().toISOString(), detail: 'Pipeline run'}]);
                                                                                                                                return;
                                                                                                                              }
                                                                                                                              if (platformAction === 'Automate Across Clouds' && backendUrl) {
                                                                                                                                await fetch(backendUrl + '/platform-action', {
                                                                                                                                  method: 'POST',
                                                                                                                                  headers: {'Content-Type': 'application/json'},
                                                                                                                                  body: JSON.stringify({ platform: 'crosscloud', action: 'Automate Across Clouds', details: { automation: customPlatformAction } })
                                                                                                                                });
                                                                                                                                setWsStatus('Cross-cloud orchestration executed.');
                                                                                                                                setActivityLog([...activityLog, {user: editUser || 'system', action: 'cross-cloud-orchestration', time: new Date().toISOString(), detail: 'Cross-cloud automation'}]);
                                                                                                                                return;
                                                                                                                              }
                                                                                                            // Advanced orchestration scenarios: event-driven, scheduled, adaptive
                                                                                                            if (platformAction === 'Event Trigger' && backendUrl) {
                                                                                                              const actions = [
                                                                                                                { platform: 'openai', action: 'Run Inference', details: { input: customPlatformAction } },
                                                                                                                { platform: 'slackworkflow', action: 'Run Workflow', details: { workflow: customPlatformAction } }
                                                                                                              ];
                                                                                                              await Promise.all(actions.map(act => fetch(backendUrl + '/platform-action', {
                                                                                                                method: 'POST',
                                                                                                                headers: {'Content-Type': 'application/json'},
                                                                                                                body: JSON.stringify(act)
                                                                                                              })));
                                                                                                              setWsStatus('Event-driven orchestration executed.');
                                                                                                              setActivityLog([...activityLog, {user: editUser || 'system', action: 'event-driven-orchestration', time: new Date().toISOString(), detail: actions}]);
                                                                                                              return;
                                                                                                            }
                                                                                                            if (platformAction === 'Scheduled Trigger' && backendUrl) {
                                                                                                              const actions = [
                                                                                                                { platform: 'googlecloudfunctions', action: 'Run Function', details: { function: customPlatformAction } },
                                                                                                                { platform: 'paypal', action: 'Create Payment', details: { payment: customPlatformAction } }
                                                                                                              ];
                                                                                                              for (const act of actions) {
                                                                                                                await fetch(backendUrl + '/platform-action', {
                                                                                                                  method: 'POST',
                                                                                                                  headers: {'Content-Type': 'application/json'},
                                                                                                                  body: JSON.stringify(act)
                                                                                                                });
                                                                                                              }
                                                                                                              setWsStatus('Scheduled orchestration executed.');
                                                                                                              setActivityLog([...activityLog, {user: editUser || 'system', action: 'scheduled-orchestration', time: new Date().toISOString(), detail: actions}]);
                                                                                                              return;
                                                                                                            }
                                                                                                            if (platformAction === 'Adaptive Trigger' && backendUrl) {
                                                                                                              if (alerts.length > 30) {
                                                                                                                await fetch(backendUrl + '/platform-action', {
                                                                                                                  method: 'POST',
                                                                                                                  headers: {'Content-Type': 'application/json'},
                                                                                                                  body: JSON.stringify({ platform: 'anthropic', action: 'Run Inference', details: { input: customPlatformAction } })
                                                                                                                });
                                                                                                                setWsStatus('Adaptive orchestration executed: AI inference.');
                                                                                                                setActivityLog([...activityLog, {user: editUser || 'system', action: 'adaptive-orchestration', time: new Date().toISOString(), detail: 'AI inference'}]);
                                                                                                              } else {
                                                                                                                setWsStatus('Adaptive orchestration: No action taken.');
                                                                                                                setActivityLog([...activityLog, {user: editUser || 'system', action: 'adaptive-orchestration', time: new Date().toISOString(), detail: 'No action'}]);
                                                                                                              }
                                                                                                              return;
                                                                                                            }
                                                                                          // Dynamic workflow builder and AI-driven automation
                                                                                          if (platformAction === 'Dynamic Builder' && backendUrl) {
                                                                                            const actions = [
                                                                                              { platform: 'calendly', action: 'Schedule Meeting', details: { meeting: customPlatformAction } },
                                                                                              { platform: 'figma', action: 'Create Design', details: { design: customPlatformAction } },
                                                                                              { platform: 'customai', action: 'Run Inference', details: { input: customPlatformAction } },
                                                                                              { platform: 'zoho', action: 'Create Lead', details: { lead: customPlatformAction } }
                                                                                            ];
                                                                                            await Promise.all(actions.map(act => fetch(backendUrl + '/platform-action', {
                                                                                              method: 'POST',
                                                                                              headers: {'Content-Type': 'application/json'},
                                                                                              body: JSON.stringify(act)
                                                                                            })));
                                                                                            setWsStatus('Dynamic workflow builder executed.');
                                                                                            setActivityLog([...activityLog, {user: editUser || 'system', action: 'dynamic-builder', time: new Date().toISOString(), detail: actions}]);
                                                                                            return;
                                                                                          }
                                                                                          if (platformAction === 'AI-Driven Trigger' && backendUrl) {
                                                                                            // Example: AI-driven trigger
                                                                                            await fetch(backendUrl + '/platform-action', {
                                                                                              method: 'POST',
                                                                                              headers: {'Content-Type': 'application/json'},
                                                                                              body: JSON.stringify({ platform: 'customai', action: 'Run Inference', details: { input: customPlatformAction } })
                                                                                            });
                                                                                            setWsStatus('AI-driven automation executed.');
                                                                                            setActivityLog([...activityLog, {user: editUser || 'system', action: 'ai-driven-trigger', time: new Date().toISOString(), detail: 'AI inference'}]);
                                                                                            return;
                                                                                          }
                                                                        // Enhanced workflow orchestration: parallel, sequential, conditional
                                                                        if (platformAction === 'Parallel Execution' && backendUrl) {
                                                                          const actions = [
                                                                            { platform: 'slack', action: 'Send Message', details: { text: 'Critical alert spike!' } },
                                                                            { platform: 'asana', action: 'Create Task', details: { task: customPlatformAction } },
                                                                            { platform: 'sendgrid', action: 'Send Email', details: { email: customPlatformAction } },
                                                                            { platform: 'zapier', action: 'Trigger Zap', details: { zap: customPlatformAction } }
                                                                          ];
                                                                          await Promise.all(actions.map(act => fetch(backendUrl + '/platform-action', {
                                                                            method: 'POST',
                                                                            headers: {'Content-Type': 'application/json'},
                                                                            body: JSON.stringify(act)
                                                                          })));
                                                                          setWsStatus('Parallel orchestration executed.');
                                                                          setActivityLog([...activityLog, {user: editUser || 'system', action: 'parallel-orchestration', time: new Date().toISOString(), detail: actions}]);
                                                                          return;
                                                                        }
                                                                        if (platformAction === 'Sequential Execution' && backendUrl) {
                                                                          const actions = [
                                                                            { platform: 'notion', action: 'Update Page', details: { page: customPlatformAction } },
                                                                            { platform: 'airtable', action: 'Update Record', details: { record: customPlatformAction } },
                                                                            { platform: 'make', action: 'Run Scenario', details: { scenario: customPlatformAction } }
                                                                          ];
                                                                          for (const act of actions) {
                                                                            await fetch(backendUrl + '/platform-action', {
                                                                              method: 'POST',
                                                                              headers: {'Content-Type': 'application/json'},
                                                                              body: JSON.stringify(act)
                                                                            });
                                                                          }
                                                                          setWsStatus('Sequential orchestration executed.');
                                                                          setActivityLog([...activityLog, {user: editUser || 'system', action: 'sequential-orchestration', time: new Date().toISOString(), detail: actions}]);
                                                                          return;
                                                                        }
                                                                        if (platformAction === 'Conditional Execution' && backendUrl) {
                                                                          if (alerts.length > 20) {
                                                                            await fetch(backendUrl + '/platform-action', {
                                                                              method: 'POST',
                                                                              headers: {'Content-Type': 'application/json'},
                                                                              body: JSON.stringify({ platform: 'sendgrid', action: 'Send Email', details: { email: customPlatformAction } })
                                                                            });
                                                                            setWsStatus('Conditional orchestration executed: Email sent.');
                                                                            setActivityLog([...activityLog, {user: editUser || 'system', action: 'conditional-orchestration', time: new Date().toISOString(), detail: 'Email sent'}]);
                                                                          } else {
                                                                            setWsStatus('Conditional orchestration: No action taken.');
                                                                            setActivityLog([...activityLog, {user: editUser || 'system', action: 'conditional-orchestration', time: new Date().toISOString(), detail: 'No action'}]);
                                                                          }
                                                                          return;
                                                                        }
                                                      // Advanced custom logic: multi-API chain and automation
                                                      if (platformAction === 'Multi-API Chain' && backendUrl) {
                                                        const actions = [
                                                          { platform: 'slack', action: 'Send Message', details: { text: 'Critical alert spike!' } },
                                                          { platform: 'jira', action: 'Create Issue', details: { issues: customPlatformAction } },
                                                          { platform: 'stripe', action: 'Create Payment', details: { payment: customPlatformAction } },
                                                          { platform: 'webhook', action: 'Send Webhook', details: { payload: customPlatformAction } }
                                                        ];
                                                        for (const act of actions) {
                                                          await fetch(backendUrl + '/platform-action', {
                                                            method: 'POST',
                                                            headers: {'Content-Type': 'application/json'},
                                                            body: JSON.stringify(act)
                                                          });
                                                        }
                                                        setWsStatus('Advanced multi-API chain executed.');
                                                        setActivityLog([...activityLog, {user: editUser || 'system', action: 'advanced-multi-api-chain', time: new Date().toISOString(), detail: actions}]);
                                                        return;
                                                      }
                                    // Further customized workflow logic: conditional triggers and chaining
                                    if (platformAction === 'Multi-Action Chain' && backendUrl) {
                                      // Example: chain multiple API calls
                                      const actions = [
                                        { platform: 'email', action: 'Send Email', details: { subject: 'Multiple Issues', body: 'Check dashboard.' } },
                                        { platform: 'slack', action: 'Send Message', details: { text: 'Alert spike!' } },
                                        { platform: 'okta', action: 'Lock User', details: { users: customPlatformAction } }
                                      ];
                                      for (const act of actions) {
                                        await fetch(backendUrl + '/platform-action', {
                                          method: 'POST',
                                          headers: {'Content-Type': 'application/json'},
                                          body: JSON.stringify(act)
                                        });
                                      }
                                      setWsStatus('Multi-action chain executed.');
                                      setActivityLog([...activityLog, {user: editUser || 'system', action: 'multi-action-chain', time: new Date().toISOString(), detail: actions}]);
                                      return;
                                    }
                  let apiResult = '';
                    // Expanded backend API integration
                  if (backendUrl && platformAction !== 'none') {
                    try {
                      const actionPayload = {
                        platform: backendPlatform,
                        action: platformAction,
                        custom: customPlatformAction,
                        user: editUser || 'system',
                        time: new Date().toISOString()
                      };
                        let endpoint = '/platform-action';
                        // Route to platform-specific endpoint
                        if (["oracle","ibm","salesforce","servicenow","splunk","elastic"].includes(backendPlatform)) {
                          endpoint = `/${backendPlatform}-action`;
                        }
                        const res = await fetch(backendUrl + endpoint, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(actionPayload)
                      });
                      apiResult = await res.text();
                      setWsStatus('API result: ' + apiResult);
                    } catch (e) {
                      setWsStatus('API error: ' + e.message);
                    }
                  } else {
                    setWsStatus('Platform action triggered: ' + platformAction);
                  }
                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'platform-action', time: new Date().toISOString(), detail: platformAction, apiResult}]);
                };
                // Automated user/session management
                React.useEffect(() => {
                  if (sessionTimeout > 0) {
                    const timer = setTimeout(() => {
                      setCollabEditing(false);
                      setEditUser('');
                      setWsStatus('Session timed out.');
                      setActivityLog([...activityLog, {user: editUser || 'system', action: 'session timeout', time: new Date().toISOString()}]);
                    }, sessionTimeout * 60 * 1000);
                    return () => clearTimeout(timer);
                  }
                }, [sessionTimeout, collabEditing, editUser]);
                // Advanced audit workflow customization
                const [auditActions, setAuditActions] = useState(['Send to SIEM', 'Send to Slack', 'Send to REST', 'Custom Export']);
                const [selectedAuditAction, setSelectedAuditAction] = useState('Send to SIEM');
                const handleAuditAction = () => {
                  let apiResult = '';
                  if (backendUrl && selectedAuditAction) {
                    try {
                      const auditPayload = {
                        action: selectedAuditAction,
                        user: editUser || 'system',
                        time: new Date().toISOString(),
                        auditTrail
                      };
                        let endpoint = '/audit-action';
                        // Route to platform-specific audit endpoint
                        if (["oracle","ibm","salesforce","servicenow","splunk","elastic"].includes(backendPlatform)) {
                          endpoint = `/${backendPlatform}-audit`;
                        }
                        const res = await fetch(backendUrl + endpoint, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(auditPayload)
                      });
                      apiResult = await res.text();
                      setWsStatus('Audit API result: ' + apiResult);
                    } catch (e) {
                      setWsStatus('Audit API error: ' + e.message);
                    }
                  } else {
                    setWsStatus('Audit action performed: ' + selectedAuditAction);
                  }
                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'audit-action', time: new Date().toISOString(), detail: selectedAuditAction, apiResult}]);
                };
                };
            // Real-time backend connection (WebSocket simulation)
            const [wsConnected, setWsConnected] = useState(false);
            const [wsStatus, setWsStatus] = useState('');
            const [ws, setWs] = useState(null);
            useEffect(()=>{
              if (wsConnected && !ws) {
                // Simulate WebSocket connection
                const fakeWs = {
                  send: msg=>setWsStatus('Sent: '+msg),
                  onmessage: cb=>setTimeout(()=>cb({data:'Collaborative update'}), 2000)
                };
                setWs(fakeWs);
                setWsStatus('Connected to real-time backend.');
              }
              if (!wsConnected && ws) {
                setWs(null);
                setWsStatus('Disconnected.');
              }
            }, [wsConnected]);
          const [remoteUrl, setRemoteUrl] = useState('');
          const [remoteSyncStatus, setRemoteSyncStatus] = useState('');
          const [collabUsers, setCollabUsers] = useState([]);
          const [auditTrail, setAuditTrail] = useState([]);
        const [moduleHistory, setModuleHistory] = useState({});
        const [collabEditing, setCollabEditing] = useState(false);
        const [editUser, setEditUser] = useState('');
        const [remoteUpdate, setRemoteUpdate] = useState(false);
        const [remoteCode, setRemoteCode] = useState('');
      const [moduleVersions, setModuleVersions] = useState({});
      const [importFileContent, setImportFileContent] = useState('');
      const [syncModules, setSyncModules] = useState([]);
    // Script modules (display only)
    const [modules, setModules] = useState({
      alertUtils: `// alertUtils\nfunction getHighSeverity(alerts) { return alerts.filter(a=>a.severity>0.8); }\nfunction alertCount(alerts) { return alerts.length; }`,
      complianceUtils: `// complianceUtils\nfunction isCompliant(sbom) { return sbom.every(dep=>dep.vulnScore<0.5); }\nfunction getNonCompliant(sbom) { return sbom.filter(dep=>dep.vulnScore>0.5); }`,
      trafficUtils: `// trafficUtils\nfunction getTrafficSpike(flows) { return flows.length > 20; }\nfunction getFlowDetails(flows) { return flows.map(f=>f.source_lat+','+f.target_lat); }`,
      integrationUtils: `// integrationUtils\nfunction sendSlack(msg) { /* send to Slack */ }\nfunction sendPagerDuty(incident) { /* send to PagerDuty */ }`,
      threatIntelUtils: `// threatIntelUtils\nfunction getLatestThreats(feed) { return feed.slice(-5); }\nfunction filterByActor(feed, actor) { return feed.filter(t=>t.actor===actor); }`,
      userActivityUtils: `// userActivityUtils\nfunction getActiveUsers(users) { return users.filter(u=>u.active); }\nfunction getUserLogins(users) { return users.map(u=>u.lastLogin); }`,
      exportUtils: `// exportUtils\nfunction exportCSV(data) { /* CSV export logic */ }\nfunction exportPDF(data) { /* PDF export logic */ }`,
      notificationUtils: `// notificationUtils\nfunction sendEmail(to, subject, body) { /* email logic */ }\nfunction sendTeams(msg) { /* Teams logic */ }`
    });
    const [newModuleName, setNewModuleName] = useState('');
    const [newModuleCode, setNewModuleCode] = useState('');
    const [selectedModule, setSelectedModule] = useState('alertUtils');
    const [moduleEdit, setModuleEdit] = useState(modules[selectedModule]);
    const [editing, setEditing] = useState(false);
    const [externalLibs, setExternalLibs] = useState(['lodash', 'moment', 'axios']);
    const [importedLibs, setImportedLibs] = useState([]);
    const moreLibs = ['date-fns', 'ramda', 'xml2js', 'csv-parser'];
  // Utility functions for script library
  function parseAlerts(alerts) { return alerts.filter(a=>a.severity>0.5); }
  function checkCompliance(sbom) { return sbom.every(dep=>dep.vulnScore<0.5); }
  function analyzeTraffic(flows) { return flows.length > 10; }
  function regexMatch(str, pattern) { return new RegExp(pattern).test(str); }
  function timeTrigger(hour) { return new Date().getHours() === hour; }
  const [script, setScript] = useState('// Example: if (alerts.length > 10) { trigger("notify", { message: "High alert volume!" }); }');
  const [output, setOutput] = useState('');
  const [template, setTemplate] = useState('alert');
  const templates = {
    alert: 'if (alerts.some(a=>a.severity>0.8)) { trigger("notify", { message: "High severity alert!" }); }',
    compliance: 'if (sbom.some(dep=>dep.vulnScore>0.7)) { trigger("email", { subject: "Compliance Issue", body: "Review required." }); }',
    traffic: 'if (trafficFlows.length > 20) { trigger("teams", { text: "Unusual traffic detected!" }); }',
    chain: 'if (alerts.length > 5) { trigger("slack", { text: "Alert spike!" }); trigger("siem", { event: "ALERT", details: { ... } }); }',
    multi: 'if (alerts.length > 10 && sbom.some(dep=>dep.vulnScore>0.5)) { trigger("email", { subject: "Multiple Issues", body: "Check dashboard." }); }'
  };

  const handleRun = () => {
    // Demo: just echo script
    setOutput('Script executed: ' + script);
    // TODO: actual JS eval and trigger logic
  };

  return (
    <div className="workflow-scripting-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>Import Module from File</h4>
      <input type="file" accept=".js" onChange={async e=>{
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          setImportFileContent(text);
        }
      }} style={{marginRight:'8px'}} />
      {importFileContent && <>
        <pre style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',margin:'8px 0',fontSize:'0.9em'}}>{importFileContent}</pre>
        <input value={newModuleName} onChange={e=>setNewModuleName(e.target.value)} placeholder="Module name" style={{marginRight:'8px',padding:'6px'}} />
        <button onClick={()=>{
          if (newModuleName && importFileContent) {
            setModules({...modules, [newModuleName]: importFileContent});
            setImportFileContent('');
            setNewModuleName('');
          }
        }} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Add Imported Module</button>
      </>}
      <hr style={{margin:'16px 0',borderColor:'#444'}} />
      <h4>Sync Modules Across Dashboards</h4>
      <button onClick={()=>{
        setSyncModules(Object.entries(modules).map(([name, code])=>({name, code})));
      }} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}}>Export Module Set</button>
      <input type="file" accept=".json" onChange={async e=>{
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          try {
            const modSet = JSON.parse(text);
            const modObj = {};
            modSet.forEach(m=>{ modObj[m.name]=m.code; });
            setModules({...modules, ...modObj});
          } catch {}
        }
      }} style={{marginRight:'8px'}} />
      {syncModules.length > 0 && <button onClick={()=>{
        const blob = new Blob([JSON.stringify(syncModules, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modules.json';
        a.click();
        URL.revokeObjectURL(url);
      }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Download Module Set</button>}
      <hr style={{margin:'16px 0',borderColor:'#444'}} />
      <h4>Module Versioning</h4>
      <div style={{marginBottom:'8px',color:'#aaa',fontSize:'0.9em'}}>
        <em>Version: {moduleVersions[selectedModule] || 1}</em>
        <button onClick={()=>{
          setModuleVersions({...moduleVersions, [selectedModule]: (moduleVersions[selectedModule]||1)+1});
        }} style={{marginLeft:'8px',padding:'4px 10px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Bump Version</button>
        <button onClick={()=>{
          if (moduleVersions[selectedModule] && moduleVersions[selectedModule]>1) {
            setModuleVersions({...moduleVersions, [selectedModule]: moduleVersions[selectedModule]-1});
          }
        }} style={{marginLeft:'8px',padding:'4px 10px',background:'#ff9800',color:'#fff',border:'none',borderRadius:'6px'}}>Revert Version</button>
      </div>
      <h4>Add Custom Module</h4>
      <input value={newModuleName} onChange={e=>setNewModuleName(e.target.value)} placeholder="Module name" style={{marginRight:'8px',padding:'6px'}} />
      <textarea value={newModuleCode} onChange={e=>setNewModuleCode(e.target.value)} placeholder="Module code..." style={{width:'60%',height:'40px',marginRight:'8px'}} />
      <button onClick={()=>{
        if (newModuleName && newModuleCode) {
          setModules({...modules, [newModuleName]: newModuleCode});
          setNewModuleName('');
          setNewModuleCode('');
        }
      }} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Add Module</button>
      <button onClick={()=>{
        if (selectedModule && !['alertUtils','complianceUtils','trafficUtils','integrationUtils','threatIntelUtils','userActivityUtils','exportUtils','notificationUtils'].includes(selectedModule)) {
          const m = {...modules};
          delete m[selectedModule];
          setModules(m);
          setSelectedModule('alertUtils');
        }
      }} style={{marginLeft:'8px',padding:'6px 12px',background:'#ff0033',color:'#fff',border:'none',borderRadius:'6px'}}>Remove Module</button>
      <hr style={{margin:'16px 0',borderColor:'#444'}} />
      <h4>Import External Libraries</h4>
      {[...externalLibs, ...moreLibs].map(lib=>(
        <button key={lib} style={{marginLeft:'8px',padding:'4px 10px',background:importedLibs.includes(lib)?'#4caf50':'#888',color:'#fff',border:'none',borderRadius:'6px'}} onClick={()=>{
          if (!importedLibs.includes(lib)) setImportedLibs([...importedLibs, lib]);
        }}>{lib}</button>
      ))}
      {importedLibs.length > 0 && <span style={{marginLeft:'16px',color:'#00bfff'}}>Imported: {importedLibs.join(', ')}</span>}
      <hr style={{margin:'16px 0',borderColor:'#444'}} />
      <h4>Module Sharing & Export</h4>
      <button onClick={()=>{
        navigator.clipboard.writeText(modules[selectedModule]);
      }} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}}>Copy to Clipboard</button>
      <button onClick={()=>{
        const blob = new Blob([modules[selectedModule]], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedModule + '.js';
        a.click();
        URL.revokeObjectURL(url);
      }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Download Module</button>
      <h4>Script Modules</h4>
      <label>Module:
        <select value={selectedModule} onChange={e=>{
          setSelectedModule(e.target.value);
          setModuleEdit(modules[e.target.value]);
          setEditing(false);
        }} style={{marginLeft:'8px',marginBottom:'8px'}}>
          {Object.keys(modules).map(m=>(<option key={m} value={m}>{m}</option>))}
        </select>
      </label>
      <div style={{margin:'8px 0'}}>
                                      <h4>Platform-Specific Actions</h4>
                                      <label>Action:
                                        <select value={platformAction} onChange={e=>setPlatformAction(e.target.value)} style={{marginLeft:'8px'}}>
                                          {platformActions[backendPlatform]?.map(act=>(<option key={act} value={act}>{act}</option>))}
                                        </select>
                                      </label>
                                      {platformAction && platformAction.toLowerCase().includes('custom') && (
                                        <input value={customPlatformAction} onChange={e=>setCustomPlatformAction(e.target.value)} placeholder="Custom action details" style={{marginLeft:'8px',padding:'6px'}} />
                                      )}
                                      <button onClick={handlePlatformAction} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px',marginLeft:'8px'}}>Trigger Action (API)</button>
                                      {platformAction !== 'none' && <span style={{marginLeft:'16px',color:'#00bfff'}}>Last action: {platformAction}</span>}
                                      {backendUrl && <div style={{marginTop:'8px',color:'#00bfff'}}>Connected to backend API: {backendUrl}</div>}
                                      <h4>User/Session Automation</h4>
                                      <button onClick={()=>{
                                        setCollabEditing(true);
                                        setActivityLog([...activityLog, {user: editUser || 'system', action: 'session start', time: new Date().toISOString()}]);
                                        setWsStatus('Session started for user: ' + (editUser || 'system'));
                                      }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}}>Start Session</button>
                                      <button onClick={()=>{
                                        setCollabEditing(false);
                                        setEditUser('');
                                        setActivityLog([...activityLog, {user: editUser || 'system', action: 'session end', time: new Date().toISOString()}]);
                                        setWsStatus('Session ended.');
                                      }} style={{padding:'6px 12px',background:'#ff0033',color:'#fff',border:'none',borderRadius:'6px'}}>End Session</button>
                                      <div style={{marginTop:'8px',color:'#00bfff'}}>Session: {collabEditing ? 'Active' : 'Inactive'} | User: {editUser || 'None'}</div>
                                      <h4>Custom Audit Workflow</h4>
                                      <label>Audit Action:
                                        <select value={selectedAuditAction} onChange={e=>setSelectedAuditAction(e.target.value)} style={{marginLeft:'8px'}}>
                                          {auditActions.map(act=>(<option key={act} value={act}>{act}</option>))}
                                        </select>
                                      </label>
                                      <button onClick={handleAuditAction} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px',marginLeft:'8px'}}>Perform Audit Action</button>
                                      <div style={{marginTop:'8px',color:'#00bfff'}}>Last audit action: {selectedAuditAction}</div>
                                <h4>Backend Platform Integration</h4>
                                <label>Platform:
                                  <select value={backendPlatform} onChange={e=>setBackendPlatform(e.target.value)} style={{marginLeft:'8px'}}>
                                    <option value="custom">Custom REST</option>
                                    <option value="aws">AWS</option>
                                    <option value="azure">Azure</option>
                                    <option value="gcp">GCP</option>
                                    <option value="github">GitHub</option>
                                  </select>
                                </label>
                                <button onClick={()=>setWsStatus('Connected to '+backendPlatform+' backend.')} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px',marginLeft:'8px'}}>Connect Platform</button>
                              </div>
                              <div style={{margin:'8px 0'}}>
                                <h4>Automated Audit Log Delivery</h4>
                                <label>Schedule:
                                  <select value={auditDeliverySchedule} onChange={e=>setAuditDeliverySchedule(e.target.value)} style={{marginLeft:'8px'}}>
                                    <option value="manual">Manual</option>
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="onchange">On Change</option>
                                  </select>
                                </label>
                                <button onClick={()=>{
                                  setAuditDeliveryStatus('Audit log sent to '+backendPlatform+' ('+auditDeliverySchedule+')');
                                  setActivityLog([...activityLog, {user: editUser || 'system', action: 'audit delivery', time: new Date().toISOString()}]);
                                }} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px',marginLeft:'8px'}}>Send Audit Log</button>
                                {auditDeliveryStatus && <span style={{marginLeft:'16px',color:'#00bfff'}}>{auditDeliveryStatus}</span>}
                              </div>
                              <div style={{margin:'8px 0'}}>
                                <h4>Collaboration Controls</h4>
                                <label>User Management:</label>
                                <input value={editUser} onChange={e=>setEditUser(e.target.value)} placeholder="Add user..." style={{marginLeft:'8px',padding:'6px'}} />
                                <button onClick={()=>{
                                  if (editUser && !collabUsersList.includes(editUser)) setCollabUsersList([...collabUsersList, editUser]);
                                }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px',marginLeft:'8px'}}>Add User</button>
                                <button onClick={()=>{
                                  setCollabUsersList(collabUsersList.filter(u=>u!==editUser));
                                }} style={{padding:'6px 12px',background:'#ff0033',color:'#fff',border:'none',borderRadius:'6px',marginLeft:'8px'}}>Remove User</button>
                                {collabUsersList.length > 0 && <span style={{marginLeft:'16px',color:'#ff9800'}}>Users: {collabUsersList.join(', ')}</span>}
                                <label style={{marginLeft:'16px'}}>Session Timeout (min):
                                  <input type="number" value={sessionTimeout} onChange={e=>setSessionTimeout(Number(e.target.value))} style={{marginLeft:'8px',width:'60px'}} />
                                </label>
                                <button onClick={()=>setAdminOverride(!adminOverride)} style={{marginLeft:'16px',padding:'6px 12px',background:adminOverride?'#ff9800':'#888',color:'#fff',border:'none',borderRadius:'6px'}}>Admin Override {adminOverride?'ON':'OFF'}</button>
                                <div style={{marginTop:'8px',color:'#00bfff'}}>Timeout: {sessionTimeout} min | Admin Override: {adminOverride?'Enabled':'Disabled'}</div>
                                <h5 style={{marginTop:'8px'}}>Activity Log</h5>
                                <ul style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',fontSize:'0.9em'}}>
                                  {activityLog.map((entry, idx)=>(
                                    <li key={idx}>[{entry.time}] {entry.user} {entry.action}</li>
                                  ))}
                                </ul>
                              </div>
                        <h4>Real Backend Endpoint</h4>
                        <input value={backendUrl} onChange={e=>setBackendUrl(e.target.value)} placeholder="Backend REST/WebSocket URL" style={{width:'60%',marginRight:'8px',padding:'6px'}} />
                        <button onClick={async ()=>{
                          // Simulate backend POST
                          setWsStatus('Connected to real backend: '+backendUrl);
                        }} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Connect Backend</button>
                      </div>
                      <div style={{margin:'8px 0'}}>
                        <h4>Audit Log Format Customization</h4>
                        <label>Format:
                          <select value={auditFormat} onChange={e=>setAuditFormat(e.target.value)} style={{marginLeft:'8px'}}>
                            <option value="plain">Plain</option>
                            <option value="json">JSON</option>
                            <option value="csv">CSV</option>
                          </select>
                        </label>
                        <textarea value={auditTemplate} onChange={e=>setAuditTemplate(e.target.value)} style={{width:'60%',height:'40px',margin:'8px 0'}} />
                        <button onClick={()=>{
                          // Preview audit log
                          const preview = auditTrail.map(e=>{
                            if (auditFormat==='json') return JSON.stringify(e);
                            if (auditFormat==='csv') return `${e.time},${e.user},${e.action},${e.module}`;
                            return auditTemplate.replace('{time}',e.time).replace('{user}',e.user).replace('{action}',e.action).replace('{module}',e.module);
                          }).join('\n');
                          setAuditPreview(preview);
                        }} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px'}}>Preview</button>
                        {auditPreview && <pre style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',margin:'8px 0',fontSize:'0.9em'}}>{auditPreview}</pre>}
                      </div>
                      <div style={{margin:'8px 0'}}>
                        <h4>Advanced Collaboration Features</h4>
                        <label>Role:
                          <select value={collabRole} onChange={e=>setCollabRole(e.target.value)} style={{marginLeft:'8px'}}>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>
                        <label style={{marginLeft:'16px'}}>Permission:
                          <input type="checkbox" checked={collabPermission} onChange={e=>setCollabPermission(e.target.checked)} style={{marginLeft:'8px'}} />
                        </label>
                        <input value={collabCursor} onChange={e=>setCollabCursor(e.target.value)} placeholder="Cursor position (e.g. line:col)" style={{marginLeft:'16px',padding:'6px'}} />
                        <span style={{marginLeft:'16px',color:'#00bfff'}}>Role: {collabRole}, Permission: {collabPermission?'Edit':'View'}, Cursor: {collabCursor}</span>
                      </div>
                <h4>Real-Time Backend</h4>
                <button onClick={()=>setWsConnected(true)} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}}>Connect</button>
                <button onClick={()=>setWsConnected(false)} style={{padding:'6px 12px',background:'#ff0033',color:'#fff',border:'none',borderRadius:'6px'}}>Disconnect</button>
                {wsStatus && <span style={{marginLeft:'16px',color:'#00bfff'}}>{wsStatus}</span>}
                {wsConnected && <button onClick={()=>ws && ws.send('Collaborative edit')} style={{marginLeft:'16px',padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Send Collaborative Edit</button>}
              </div>
              <div style={{margin:'8px 0'}}>
                <h4>External Audit Log Integration</h4>
                <button onClick={()=>{
                  // Simulate sending audit log to SIEM/Slack/REST
                  const log = auditTrail.map(e=>`[${e.time}] ${e.user} ${e.action} module ${e.module}`).join('\n');
                  setWsStatus('Audit log sent to external system.');
                }} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px'}}>Send Audit Log to External System</button>
              </div>
        <label>Import external libraries:</label>
        {externalLibs.map(lib=>(
          <button key={lib} style={{marginLeft:'8px',padding:'4px 10px',background:importedLibs.includes(lib)?'#4caf50':'#888',color:'#fff',border:'none',borderRadius:'6px'}} onClick={()=>{
            if (!importedLibs.includes(lib)) setImportedLibs([...importedLibs, lib]);
          }}>{lib}</button>
        ))}
        {importedLibs.length > 0 && <span style={{marginLeft:'16px',color:'#00bfff'}}>Imported: {importedLibs.join(', ')}</span>}
      </div>
      {editing ? (
        <textarea value={moduleEdit} onChange={e=>setModuleEdit(e.target.value)} style={{width:'100%',height:'80px',margin:'8px 0'}} />
      ) : (
        <pre style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',marginBottom:'8px',fontSize:'0.9em'}}>{modules[selectedModule]}</pre>
      )}
      <div style={{marginBottom:'8px',color:'#aaa',fontSize:'0.9em'}}><em>Example usage: <br/>const severe = getHighSeverity(alerts);</em></div>
      <button onClick={()=>setEditing(!editing)} style={{marginRight:'8px',padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>{editing ? 'Save Module' : 'Edit Module'}</button>
      {editing && <button onClick={()=>{
        // Save history
        setModuleHistory({
          ...moduleHistory,
          [selectedModule]: [moduleEdit, ...(moduleHistory[selectedModule]||[])]
        });
        setModules({...modules, [selectedModule]: moduleEdit});
        setEditing(false);
      }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Apply Changes</button>}
      {/* Module History UI */}
      <div style={{margin:'8px 0'}}>
        <h4>Module History</h4>
        {moduleHistory[selectedModule] && moduleHistory[selectedModule].length > 0 && (
          <ul style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',fontSize:'0.9em'}}>
            {moduleHistory[selectedModule].map((code, idx)=>(
              <li key={idx} style={{marginBottom:'4px'}}>
                <button style={{padding:'2px 8px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}} onClick={()=>{
                  setModules({...modules, [selectedModule]: code});
                }}>Restore v{moduleHistory[selectedModule].length-idx}</button>
                <span>v{moduleHistory[selectedModule].length-idx}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Collaborative Editing UI */}
      <div style={{margin:'8px 0'}}>
        <h4>Collaborative Editing</h4>
        <label>Edit lock:
          <input type="checkbox" checked={collabEditing} onChange={e=>setCollabEditing(e.target.checked)} style={{marginLeft:'8px'}} />
        </label>
        <input value={editUser} onChange={e=>setEditUser(e.target.value)} placeholder="User editing..." style={{marginLeft:'8px',padding:'6px'}} />
        {collabEditing && <span style={{marginLeft:'16px',color:'#ff9800'}}>Editing locked by {editUser || 'unknown user'}</span>}
      </div>
      {/* Automated Module Updates UI */}
            <div style={{margin:'8px 0'}}>
              <h4>Remote Source Sync</h4>
              <input value={remoteUrl} onChange={e=>setRemoteUrl(e.target.value)} placeholder="Remote URL (GitHub/raw, REST, etc)" style={{width:'60%',marginRight:'8px',padding:'6px'}} />
              <button onClick={async ()=>{
                try {
                  const res = await fetch(remoteUrl);
                  const code = await res.text();
                  setModules({...modules, [selectedModule]: code});
                  setRemoteSyncStatus('Synced from remote source.');
                  setAuditTrail([...auditTrail, {user: editUser || 'remote', action: 'sync', module: selectedModule, time: new Date().toISOString()}]);
                } catch {
                  setRemoteSyncStatus('Failed to sync.');
                }
              }} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Sync from Remote</button>
              {remoteSyncStatus && <span style={{marginLeft:'16px',color:'#00bfff'}}>{remoteSyncStatus}</span>}
            </div>
            <div style={{margin:'8px 0'}}>
              <h4>Live Collaboration</h4>
              <button onClick={()=>{
                // Simulate user join
                setCollabUsers([...collabUsers, editUser || 'anonymous']);
              }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}}>Join Collaboration</button>
              <button onClick={()=>{
                // Simulate user leave
                setCollabUsers(collabUsers.filter(u=>u!==editUser));
              }} style={{padding:'6px 12px',background:'#ff0033',color:'#fff',border:'none',borderRadius:'6px'}}>Leave Collaboration</button>
              {collabUsers.length > 0 && <span style={{marginLeft:'16px',color:'#ff9800'}}>Active users: {collabUsers.join(', ')}</span>}
            </div>
            <div style={{margin:'8px 0'}}>
              <h4>Audit Trail</h4>
              <ul style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',fontSize:'0.9em'}}>
                {auditTrail.map((entry, idx)=>(
                  <li key={idx}>
                    [{entry.time}] {entry.user} {entry.action} module {entry.module}
                  </li>
                ))}
              </ul>
            </div>
      <div style={{margin:'8px 0'}}>
        <h4>Automated Module Updates</h4>
        <button onClick={()=>{
          // Simulate remote update
          setRemoteUpdate(true);
          setRemoteCode('// Remote update code for '+selectedModule+'\nfunction updated() { return true; }');
        }} style={{padding:'6px 12px',background:'#00bfff',color:'#fff',border:'none',borderRadius:'6px',marginRight:'8px'}}>Check for Remote Update</button>
        {remoteUpdate && <>
          <pre style={{background:'#181f2a',color:'#00ff99',padding:'8px',borderRadius:'6px',margin:'8px 0',fontSize:'0.9em'}}>{remoteCode}</pre>
          <button onClick={()=>{
            setModules({...modules, [selectedModule]: remoteCode});
            setRemoteUpdate(false);
            setRemoteCode('');
          }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Apply Remote Update</button>
        </>}
      </div>
      }} style={{padding:'6px 12px',background:'#4caf50',color:'#fff',border:'none',borderRadius:'6px'}}>Apply Changes</button>}
      <h4>Script Library</h4>
      <pre style={{background:'#181f2a',color:'#00bfff',padding:'8px',borderRadius:'6px',marginBottom:'8px',fontSize:'0.9em'}}>{`
function parseAlerts(alerts) { return alerts.filter(a=>a.severity>0.5); }
function checkCompliance(sbom) { return sbom.every(dep=>dep.vulnScore<0.5); }
function analyzeTraffic(flows) { return flows.length > 10; }
function regexMatch(str, pattern) { return new RegExp(pattern).test(str); }
function timeTrigger(hour) { return new Date().getHours() === hour; }
`}</pre>
      <h4>Workflow Scripting</h4>
      <label>Template:
        <select value={template} onChange={e=>{setTemplate(e.target.value);setScript(templates[e.target.value]);}} style={{marginLeft:'8px',marginBottom:'8px'}}>
          <option value="alert">Alert Trigger</option>
          <option value="compliance">Compliance Trigger</option>
          <option value="traffic">Traffic Trigger</option>
          <option value="chain">Chained Actions</option>
          <option value="multi">Multi-Condition</option>
        </select>
      </label>
      <textarea value={script} onChange={e=>setScript(e.target.value)} style={{width:'100%',height:'80px',margin:'8px 0'}} />
      <button onClick={handleRun} style={{padding:'6px 12px',background:'#2196f3',color:'#fff',border:'none',borderRadius:'6px'}}>Run Script</button>
      {output && <div style={{marginTop:'8px',background:'#181f2a',padding:'8px',borderRadius:'6px'}}>{output}</div>}
    </div>
  );
}

export default WorkflowScriptingPanel;
