import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Text,
  Form,
  FormLayout,
  TextField,
  Button,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

export default function HomePage() {
  const shopify = useAppBridge();

  const [announcementText, setAnnouncementText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);

  // Fetch the current text from our MongoDB db
  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const response = await fetch("/api/announcement");
        if (response.ok) {
          const data = await response.json();
          setAnnouncementText(data.announcement || "");
        }
      } catch (err) {
        console.error("Failed to fetch announcement:", err);
      } finally {
        setInitialFetchLoading(false);
      }
    }
    fetchAnnouncement();
  }, []);

  const handleTextChange = useCallback((value) => setAnnouncementText(value), []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: announcementText }),
      });

      if (response.ok) {
        shopify.toast.show("Announcement saved and synced!");
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      shopify.toast.show("Failed to save announcement: " + String(error), { isError: true });
    } finally {
      setLoading(false);
    }
  }, [announcementText, shopify]);

  return (
    <Page narrowWidth>
      <TitleBar title="Announcement App" />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <TextContainer spacing="loose">
              <Text as="h2" variant="headingMd">
                Storefront Announcement Banner
              </Text>
              <p>
                Enter the text below to display on your storefront banner. This will save to database and sync to a Shop Metafield.
              </p>
              
              {!initialFetchLoading && (
                <Form onSubmit={handleSave}>
                  <FormLayout>
                    <TextField
                      value={announcementText}
                      onChange={handleTextChange}
                      label="Announcement Text"
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. Free shipping on all orders over $50!"
                    />
                    <Button submit primary loading={loading}>
                      Save Announcement
                    </Button>
                  </FormLayout>
                </Form>
              )}
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
