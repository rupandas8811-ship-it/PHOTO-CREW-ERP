sed -i '605,620c\
              for (const a of matchingAssignments) {\
                const assignmentUpdates = {\
                  edited_drive_link: linkVal,\
                  Edited_Drive_Link: linkVal,\
                  final_edited_footage_link: linkVal,\
                  server_upload_folder_name: folderVal,\
                  server_upload_confirmed: true,\
                  edited_folder_uploaded_to_server: true,\
                  server_upload_confirmed_at: new Date().toISOString(),\
                  server_upload_confirmed_by: "Production Team"\
                };\
                await pushUpdate("editor_assignments", "assignment_id", a.assignment_id, assignmentUpdates);\
              }\
            }' src/components/production/ProductionClientAcceptanceManager.tsx
